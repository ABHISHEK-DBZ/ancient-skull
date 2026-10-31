import io
import logging
import os
import re
import shutil
import subprocess
import zipfile
from pathlib import Path
from typing import Optional
from fastapi import HTTPException
import httpx

from app.core.security import redact_secrets

logger = logging.getLogger(__name__)


def parse_github_owner_repo(repo_url: str) -> Optional[tuple[str, str]]:
    """Extract (owner, repo) from GitHub URL variants."""
    clean = repo_url.strip()
    clean = re.sub(r"\.git$", "", clean)
    clean = re.sub(r"^git@github\.com:", "https://github.com/", clean)
    clean = re.sub(r"^(http://|https://)?(www\.)?github\.com/", "", clean)

    parts = [p for p in clean.strip("/").split("/") if p]
    if len(parts) >= 2:
        return parts[0], parts[1]
    return None


def download_github_zip(owner: str, repo: str, destination_dir: Path, access_token: Optional[str] = None) -> None:
    """Download and extract a GitHub repository as a ZIP archive without requiring git."""
    headers = {
        "User-Agent": "ExitCapsule-Fetcher/1.0",
        "Accept": "application/vnd.github+json"
    }
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"

    zip_bytes: Optional[bytes] = None

    # 1. If we have a token, use GitHub's zipball API endpoint
    if access_token:
        api_url = f"https://api.github.com/repos/{owner}/{repo}/zipball"
        try:
            with httpx.Client(follow_redirects=True, timeout=90.0) as client:
                res = client.get(api_url, headers=headers)
                if res.status_code == 200 and res.content:
                    zip_bytes = res.content
        except Exception as e:
            logger.warning(f"Failed to fetch zipball via GitHub API: {e}")

    # 2. If no token or API failed, try public archive endpoints
    if not zip_bytes:
        public_urls = [
            f"https://github.com/{owner}/{repo}/archive/HEAD.zip",
            f"https://github.com/{owner}/{repo}/archive/refs/heads/main.zip",
            f"https://github.com/{owner}/{repo}/archive/refs/heads/master.zip",
        ]
        last_error = None
        for p_url in public_urls:
            try:
                with httpx.Client(follow_redirects=True, timeout=90.0) as client:
                    res = client.get(p_url, headers={"User-Agent": "ExitCapsule-Fetcher/1.0"})
                    if res.status_code == 200 and res.content:
                        zip_bytes = res.content
                        break
                    else:
                        last_error = f"HTTP {res.status_code}"
            except Exception as e:
                last_error = str(e)

        if not zip_bytes:
            raise HTTPException(
                status_code=400,
                detail=f"Could not download repository archive from GitHub for {owner}/{repo}: {last_error or 'Not found'}"
            )

    # 3. Extract the zip into destination_dir, stripping the root commit hash directory
    destination_dir.mkdir(parents=True, exist_ok=True)
    try:
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            namelist = zf.namelist()
            if not namelist:
                raise ValueError("Downloaded archive is empty")

            prefix = namelist[0].split("/")[0] + "/" if "/" in namelist[0] else ""
            for member in zf.infolist():
                if member.is_dir():
                    continue
                filename = member.filename
                rel = filename[len(prefix):] if (prefix and filename.startswith(prefix)) else filename
                if not rel:
                    continue

                dest_file = destination_dir / rel
                dest_file.parent.mkdir(parents=True, exist_ok=True)
                with zf.open(member) as src, open(dest_file, "wb") as dst:
                    dst.write(src.read())

    except Exception as exc:
        shutil.rmtree(destination_dir, ignore_errors=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to unpack repository archive: {redact_secrets(str(exc))}"
        )


def fetch_git_repository(
    target_repo: str,
    destination_dir: Path,
    access_token: Optional[str] = None
) -> None:
    """
    Fetch a remote git repository into destination_dir.
    Uses 'git clone' if available, otherwise falls back to downloading the GitHub archive.
    """
    git_bin = shutil.which("git")
    use_git = git_bin is not None

    if use_git:
        # Build clone command
        clone_url = target_repo
        if access_token and "github.com" in target_repo:
            parsed = parse_github_owner_repo(target_repo)
            if parsed:
                owner, repo = parsed
                clone_url = f"https://x-access-token:{access_token}@github.com/{owner}/{repo}.git"

        destination_dir.parent.mkdir(parents=True, exist_ok=True)
        try:
            cmd = ["git", "clone", "--depth", "1", clone_url, str(destination_dir)]
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120,
                env={**dict(os.environ), "GIT_TERMINAL_PROMPT": "0"}
            )
            if proc.returncode == 0:
                return  # Success
            logger.warning(f"git clone failed with code {proc.returncode}: {proc.stderr[:200]}")
        except FileNotFoundError:
            # git executable disappeared or was a broken shim
            use_git = False
        except Exception as e:
            logger.warning(f"git clone execution error: {e}")

    # Fallback path: If target is GitHub, download ZIP archive
    parsed = parse_github_owner_repo(target_repo)
    if parsed:
        owner, repo = parsed
        logger.info(f"Using HTTP archive fallback for GitHub repo {owner}/{repo}")
        download_github_zip(owner, repo, destination_dir, access_token=access_token)
        return

    # If not GitHub and git is unavailable
    if not use_git:
        raise HTTPException(
            status_code=400,
            detail="The 'git' command-line tool is not installed in this environment. For GitHub repositories, please enter a valid GitHub URL (e.g. https://github.com/owner/repo) to analyze directly."
        )

    raise HTTPException(
        status_code=400,
        detail="Failed to clone repository. Please verify the URL and permissions."
    )

