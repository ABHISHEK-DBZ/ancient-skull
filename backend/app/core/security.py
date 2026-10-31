import os
import re
import time
import subprocess
from pathlib import Path
from typing import Tuple, Optional, Dict
from app.core.exceptions import PathSecurityError, CommandExecutionError

SECRET_PATTERNS = [
    re.compile(r'(?i)(?:api_key|apikey|secret|token|password|auth|authorization)["\']?\s*[:=]\s*["\']?([a-zA-Z0-9_\-\.]{8,})["\']?'),
    re.compile(r'ghp_[a-zA-Z0-9]{36}'),
    re.compile(r'github_pat_[a-zA-Z0-9_]{82}'),
    re.compile(r'sk-[a-zA-Z0-9]{20,48}'),
    re.compile(r'Bearer\s+([a-zA-Z0-9_\-\.]{15,})', re.IGNORECASE),
]

def redact_secrets(text: str) -> str:
    """Redact API keys, tokens, and passwords from strings and logs."""
    if not text:
        return ""
    redacted = text
    for pattern in SECRET_PATTERNS:
        def _replace_match(match: re.Match) -> str:
            val = match.group(0)
            if match.groups():
                secret_sub = match.group(1)
                return val.replace(secret_sub, "[REDACTED_SECRET]")
            return "[REDACTED_SECRET]"
        redacted = pattern.sub(_replace_match, redacted)
    return redacted

def validate_safe_path(base_dir: str | Path, target_path: str | Path) -> Path:
    """
    Ensure target_path resolves inside base_dir without path traversal.
    Raises PathSecurityError if traversal is attempted.
    """
    base = Path(base_dir).resolve()
    target = (base / target_path).resolve()
    try:
        # relative_to will raise ValueError if target is not within base
        target.relative_to(base)
    except ValueError:
        raise PathSecurityError(f"Path traversal detected: {target_path} escapes {base}")
    return target

def is_safe_repo_path(repo_path: str | Path) -> bool:
    """Validate that a repo directory exists and sits inside an allowed root.

    With ALLOWED_SCAN_ROOTS empty the local single-user mode accepts any
    directory. Public deployments must set the allowlist so the API cannot
    read arbitrary server paths.
    """
    from app.config import settings

    try:
        path = Path(repo_path).expanduser().resolve()
    except (OSError, RuntimeError):
        return False
    if not path.exists() or not path.is_dir():
        return False
    roots = settings.allowed_scan_roots
    if not roots:
        return not settings.REQUIRE_AUTH
    return any(path == root or root in path.parents for root in roots)

def execute_isolated_command(
    cmd: list[str],
    cwd: Path | str,
    timeout: int = 120,
    max_bytes: int = 524288,
    env: Optional[Dict[str, str]] = None
) -> Tuple[int, str, str, float]:
    """
    Executes a subprocess command safely:
    - Never uses shell=True.
    - Strictly enforces timeout.
    - Strictly limits stdout/stderr bytes.
    - Redacts any sensitive secrets from captured output.
    Returns (exit_code, stdout_str, stderr_str, elapsed_seconds).
    """
    start_time = time.time()
    cwd_path = Path(cwd).resolve()
    if not cwd_path.exists():
        raise CommandExecutionError(f"Working directory does not exist: {cwd_path}")

    # Build safe environment without passing parent process secret keys if not needed
    exec_env = os.environ.copy()
    if env:
        exec_env.update(env)

    # Mask known secret keys in subprocess env
    exec_env.pop("GEMMA_API_KEY", None)

    try:
        process = subprocess.Popen(
            cmd,
            cwd=str(cwd_path),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=False,
            env=exec_env,
            text=True,
            errors="replace"
        )
        stdout, stderr = process.communicate(timeout=timeout)
        elapsed = round(time.time() - start_time, 3)

        # Truncate if exceeded max_bytes
        if len(stdout.encode("utf-8", errors="replace")) > max_bytes:
            stdout = stdout[:max_bytes] + "\n[OUTPUT TRUNCATED: Exceeded byte limit]"
        if len(stderr.encode("utf-8", errors="replace")) > max_bytes:
            stderr = stderr[:max_bytes] + "\n[ERROR OUTPUT TRUNCATED: Exceeded byte limit]"

        return process.returncode, redact_secrets(stdout), redact_secrets(stderr), elapsed

    except subprocess.TimeoutExpired:
        process.kill()
        stdout, stderr = process.communicate()
        elapsed = round(time.time() - start_time, 3)
        return -1, redact_secrets(stdout), f"Command timed out after {timeout} seconds", elapsed
    except Exception as e:
        elapsed = round(time.time() - start_time, 3)
        return -1, "", f"Failed to execute command: {str(e)}", elapsed
