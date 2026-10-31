import re
import time
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, Request, Response

from app.config import settings
from app.core.token_cipher import decrypt_token
from app.database import get_db_connection

_TOKEN_IN_URL = re.compile(r"x-access-token:[^@]+@", re.IGNORECASE)


def is_https(request: Request) -> bool:
    forwarded = (request.headers.get("x-forwarded-proto") or "").lower()
    return request.url.scheme == "https" or forwarded == "https"


def get_session(request: Request) -> Optional[dict]:
    sid = request.cookies.get(settings.SESSION_COOKIE_NAME) or request.headers.get("x-session-id")
    if not sid:
        return None
    with get_db_connection() as conn:
        row = conn.execute("SELECT * FROM github_sessions WHERE session_id = ?", (sid,)).fetchone()
    if not row:
        return None
    expires_at = row["expires_at"]
    if expires_at and float(expires_at) < time.time():
        return None
    data = dict(row)
    try:
        data["access_token"] = decrypt_token(data.get("access_token") or "")
    except ValueError:
        return None
    return data


def require_session(request: Request) -> dict:
    session = get_session(request)
    if not session:
        raise HTTPException(status_code=401, detail="GitHub authorization required. Connect your GitHub account.")
    return session


def set_session_cookie(response: Response, request: Request, session_id: str) -> None:
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=session_id,
        max_age=settings.SESSION_TTL_SECONDS,
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE or is_https(request),
        samesite="lax",
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(settings.SESSION_COOKIE_NAME, path="/")


def enforce_scan_access(request: Request, scan_id: str, conn=None) -> dict:
    """Raise 404 unless the caller may see this scan.

    Scans created without an owner remain accessible in local mode so existing
    local installs keep working. As soon as a scan has an owner, only that
    GitHub user may read or mutate it.
    """
    owns_connection = conn is None
    if owns_connection:
        conn = get_db_connection()
    try:
        row = conn.execute("SELECT owner_id FROM scans WHERE scan_id = ?", (scan_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Scan '{scan_id}' not found.")
        owner_id = row["owner_id"]
        if not owner_id:
            if settings.REQUIRE_AUTH:
                raise HTTPException(status_code=404, detail=f"Scan '{scan_id}' not found.")
            return {"owner_id": None}
        session = get_session(request)
        if not session or str(session.get("github_id") or "") != str(owner_id):
            raise HTTPException(status_code=404, detail=f"Scan '{scan_id}' not found.")
        return {"owner_id": owner_id}
    finally:
        if owns_connection:
            conn.close()


def purge_legacy_git_credentials() -> int:
    """Strip embedded tokens from historic clone configurations."""
    cleaned = 0
    root = Path(settings.TEMP_WORKSPACES_DIR)
    if not root.exists():
        return 0
    for config in root.glob("*/.git/config"):
        try:
            text = config.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        if not _TOKEN_IN_URL.search(text):
            continue
        safe = _TOKEN_IN_URL.sub("", text)
        try:
            config.write_text(safe, encoding="utf-8")
            cleaned += 1
        except OSError:
            continue
    return cleaned


def purge_plaintext_workspace_tokens() -> int:
    """Remove every workspace that still contains a token in its git config."""
    removed = 0
    root = Path(settings.TEMP_WORKSPACES_DIR)
    if not root.exists():
        return 0
    import shutil

    for workspace in root.iterdir():
        config = workspace / ".git" / "config"
        if not config.exists():
            continue
        try:
            if _TOKEN_IN_URL.search(config.read_text(encoding="utf-8", errors="replace")):
                shutil.rmtree(workspace, ignore_errors=True)
                removed += 1
        except OSError:
            continue
    return removed
