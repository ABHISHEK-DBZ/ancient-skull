import re
import time
import uuid
import secrets
import shutil
import subprocess
from pathlib import Path
from typing import Optional, Dict, Any
from urllib.parse import urlencode, urlparse

import httpx
from fastapi import APIRouter, HTTPException, Query, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from app.config import settings
from app.core.auth import (
    get_session,
    require_session,
    set_session_cookie,
    clear_session_cookie,
)
from app.core.clock import iso_now
from app.core.security import redact_secrets
from app.core.token_cipher import encrypt_token
from app.database import get_db_connection
from app.routes.scan import execute_scan_pipeline
from app.scanner.git_fetcher import fetch_git_repository

router = APIRouter(prefix="/api/auth/github", tags=["github"])

GITHUB_AUTHORIZE = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN = "https://github.com/login/oauth/access_token"
GITHUB_API = "https://api.github.com"
SCOPES = "repo read:user"
_HEADERS = {"Accept": "application/json", "User-Agent": "Exit-Capsule-Workbench/1.0"}


class CallbackRequest(BaseModel):
    code: str
    state: Optional[str] = None


class CloneAndScanRequest(BaseModel):
    repo_full_name: str
    default_branch: Optional[str] = None
    run_ai: bool = False


def _origin(request: Request) -> str:
    if settings.APP_BASE_URL.strip():
        return settings.APP_BASE_URL.strip().rstrip("/")
    origin = request.headers.get("origin")
    if origin and origin != "null":
        return origin.rstrip("/")
    return str(request.base_url).rstrip("/")


def resolve_redirect_uri(request: Request) -> str:
    """Return the callback registered in the GitHub OAuth App.

    A stale GITHUB_REDIRECT_URI (for example a localhost value left in the
    production environment) is ignored when it points at a different host.
    """
    configured = settings.GITHUB_REDIRECT_URI.strip().rstrip("/")
    origin = _origin(request)
    if configured:
        configured_host = urlparse(configured).netloc.lower()
        origin_host = urlparse(origin).netloc.lower()
        if configured_host and configured_host == origin_host:
            return configured
        if not settings.APP_BASE_URL and "localhost" in origin_host and "localhost" in configured_host:
            return configured
    return f"{origin}/auth/callback"


def _git_env(token: str) -> Dict[str, str]:
    """Pass the credential through env so it never lands in argv or .git/config."""
    import os

    env = os.environ.copy()
    env["GIT_CONFIG_COUNT"] = "1"
    env["GIT_CONFIG_KEY_0"] = "http.extraHeader"
    env["GIT_CONFIG_VALUE_0"] = f"Authorization: Bearer {token}"
    env["GIT_TERMINAL_PROMPT"] = "0"
    return env


def _clean_remote(workspace: Path) -> None:
    try:
        subprocess.run(
            ["git", "-C", str(workspace), "remote", "set-url", "origin", "https://github.invalid/redacted"],
            capture_output=True,
            timeout=10,
            check=False,
        )
    except Exception:
        pass


def _create_state(redirect_uri: str) -> str:
    state = secrets.token_urlsafe(32)
    now = time.time()
    with get_db_connection() as conn:
        conn.execute("DELETE FROM oauth_states WHERE created_at < ?", (now - settings.GITHUB_OAUTH_STATE_TTL_SECONDS,))
        conn.execute(
            "INSERT INTO oauth_states (state, redirect_uri, created_at, used) VALUES (?, ?, ?, 0)",
            (state, redirect_uri, now),
        )
        conn.commit()
    return state


def _consume_state(state: Optional[str]) -> str:
    if not state:
        raise HTTPException(status_code=400, detail="Missing OAuth state. Start the GitHub connection again.")
    with get_db_connection() as conn:
        row = conn.execute("SELECT * FROM oauth_states WHERE state = ?", (state,)).fetchone()
        if not row:
            raise HTTPException(status_code=400, detail="Unknown or expired OAuth state. Start the GitHub connection again.")
        if row["used"]:
            raise HTTPException(status_code=400, detail="This OAuth state was already used. Start the GitHub connection again.")
        if float(row["created_at"]) < time.time() - settings.GITHUB_OAUTH_STATE_TTL_SECONDS:
            conn.execute("DELETE FROM oauth_states WHERE state = ?", (state,))
            conn.commit()
            raise HTTPException(status_code=400, detail="OAuth state expired. Start the GitHub connection again.")
        conn.execute("UPDATE oauth_states SET used = 1 WHERE state = ?", (state,))
        conn.commit()
        return row["redirect_uri"]


@router.get("/status")
def get_github_status(request: Request):
    is_configured = bool(settings.GITHUB_CLIENT_ID and settings.GITHUB_CLIENT_SECRET)
    session = get_session(request)
    return {
        "configured": is_configured,
        "connected": bool(session),
        "user": {
            "username": session["username"],
            "name": session["name"],
            "avatar_url": session["avatar_url"],
        } if session else None,
        "message": "GitHub OAuth ready." if is_configured else "GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are not configured on the server.",
    }


@router.get("/login")
def get_github_login_url(request: Request):
    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=400, detail="GitHub OAuth is not configured on the server.")
    redirect_uri = resolve_redirect_uri(request)
    state = _create_state(redirect_uri)
    query = urlencode({
        "client_id": settings.GITHUB_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "scope": SCOPES,
        "state": state,
        "allow_signup": "true",
    })
    return {"auth_url": f"{GITHUB_AUTHORIZE}?{query}", "redirect_uri": redirect_uri}


@router.get("/callback")
def handle_github_callback_get(
    request: Request,
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None),
):
    """Safety net when the registered callback points at the backend."""
    frontend = (settings.FRONTEND_URL.strip().rstrip("/") or _origin(request))
    params: Dict[str, str] = {}
    if error:
        params["error"] = error
        params["error_description"] = error_description or error
    elif code:
        params["code"] = code
        if state:
            params["state"] = state
    return RedirectResponse(url=f"{frontend}/auth/callback?{urlencode(params)}")


@router.post("/callback")
def handle_github_callback(req: CallbackRequest, request: Request, response: Response):
    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=400, detail="GitHub OAuth is not configured on the server.")

    redirect_uri = _consume_state(req.state)

    try:
        with httpx.Client(timeout=20.0) as client:
            token_resp = client.post(
                GITHUB_TOKEN,
                data={
                    "client_id": settings.GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET,
                    "code": req.code,
                    "redirect_uri": redirect_uri,
                },
                headers=_HEADERS,
            )
            token_data = token_resp.json() if token_resp.content else {}
            access_token = token_data.get("access_token")
            if token_resp.status_code != 200 or not access_token:
                detail = token_data.get("error_description") or token_data.get("error") or "GitHub rejected the authorization code."
                raise HTTPException(status_code=400, detail=redact_secrets(str(detail)))

            user_resp = client.get(f"{GITHUB_API}/user", headers={
                **_HEADERS,
                "Authorization": f"Bearer {access_token}",
            })
            if user_resp.status_code != 200:
                raise HTTPException(status_code=400, detail="GitHub did not return a valid user profile.")
            user_data = user_resp.json()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not complete GitHub authorization: {redact_secrets(str(exc))}")

    github_id = str(user_data.get("id") or "")
    if not github_id:
        raise HTTPException(status_code=400, detail="GitHub did not return a stable user id.")

    session_id = secrets.token_urlsafe(40)
    expires_at = time.time() + settings.SESSION_TTL_SECONDS
    username = user_data.get("login")
    name = user_data.get("name") or username
    avatar_url = user_data.get("avatar_url")
    now_iso = iso_now()

    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO users (id, login, name, avatar_url, created_at, last_login_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET login = excluded.login, name = excluded.name,
                avatar_url = excluded.avatar_url, last_login_at = excluded.last_login_at
            """,
            (github_id, username, name, avatar_url, now_iso, now_iso),
        )
        conn.execute(
            """
            INSERT INTO github_sessions (session_id, access_token, username, name, avatar_url, created_at, github_id, expires_at, scopes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (session_id, encrypt_token(access_token), username, name, avatar_url, now_iso, github_id, expires_at, SCOPES),
        )
        if token_data.get("refresh_token"):
            conn.execute(
                "UPDATE github_sessions SET refresh_token = ? WHERE session_id = ?",
                (encrypt_token(token_data["refresh_token"]), session_id),
            )
        conn.commit()

    set_session_cookie(response, request, session_id)
    return {
        "user": {"username": username, "name": name, "avatar_url": avatar_url},
        "expires_at": expires_at,
    }


@router.post("/disconnect")
def disconnect_github(request: Request, response: Response):
    session = get_session(request)
    if session:
        with get_db_connection() as conn:
            conn.execute("DELETE FROM github_sessions WHERE session_id = ?", (session["session_id"],))
            conn.commit()
    clear_session_cookie(response)
    return {"status": "DISCONNECTED", "message": "GitHub session terminated."}


def _repo_payload(repo: dict) -> dict:
    return {
        "id": repo["id"],
        "name": repo["name"],
        "full_name": repo["full_name"],
        "private": repo["private"],
        "html_url": repo["html_url"],
        "default_branch": repo.get("default_branch") or "main",
        "description": repo.get("description") or "No description provided",
        "language": repo.get("language") or "Python",
        "updated_at": repo.get("updated_at"),
    }


@router.get("/repos")
def list_github_repositories(request: Request, search: Optional[str] = Query(None)):
    session = require_session(request)
    token = session["access_token"]
    try:
        with httpx.Client(timeout=20.0) as client:
            resp = client.get(
                f"{GITHUB_API}/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member",
                headers={**_HEADERS, "Authorization": f"Bearer {token}"},
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach GitHub: {redact_secrets(str(exc))}")
    if resp.status_code == 401:
        raise HTTPException(status_code=401, detail="GitHub access expired or was revoked. Reconnect your GitHub account.")
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="GitHub returned an error while listing repositories.")

    repos = []
    for repo in resp.json():
        if search and search.lower() not in repo.get("full_name", "").lower():
            continue
        repos.append(_repo_payload(repo))
    return repos


@router.post("/clone-and-scan")
def clone_and_scan_github_repo(req: CloneAndScanRequest, request: Request):
    session = require_session(request)
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", req.repo_full_name or ""):
        raise HTTPException(status_code=400, detail="Invalid repository name. Expected 'owner/repo'.")

    token = session["access_token"]
    github_id = str(session.get("github_id") or "anon")
    scan_id = f"scan_{time.strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"
    workspace = Path(settings.TEMP_WORKSPACES_DIR) / f"gh_{github_id}_{scan_id}"
    workspace.parent.mkdir(parents=True, exist_ok=True)
    clone_url = f"https://github.com/{req.repo_full_name}.git"

    try:
        fetch_git_repository(clone_url, workspace, access_token=token)
    except HTTPException:
        shutil.rmtree(workspace, ignore_errors=True)
        raise
    except Exception as exc:
        shutil.rmtree(workspace, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Git clone failed: {redact_secrets(str(exc))}")
    finally:
        _clean_remote(workspace)

    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO scans (scan_id, repo_path, local_path, status, created_at, owner_id, progress_pct, current_step)
            VALUES (?, ?, ?, 'QUEUED', ?, ?, 0, ?)
            """,
            (scan_id, f"https://github.com/{req.repo_full_name}", str(workspace.resolve()), iso_now(), github_id,
             "Queued GitHub clone"),
        )
        conn.commit()

    import threading

    thread = threading.Thread(
        target=execute_scan_pipeline,
        args=(scan_id, str(workspace.resolve()), req.run_ai),
        daemon=True,
    )
    thread.start()

    return {"scan_id": scan_id, "status": "QUEUED", "message": f"Cloned {req.repo_full_name} and started analysis."}
