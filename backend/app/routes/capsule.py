import hashlib
import json
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse
from app.config import settings
from app.core.auth import enforce_scan_access
from app.database import get_db_connection
from app.switch.review import sync_replies

router = APIRouter(prefix="/api/scans", tags=["Capsule"])


def _resolve_capsule_file(path_str: Optional[str], scan_id: str, filename: str) -> Optional[Path]:
    """Resolve capsule files safely across relative, absolute, and default locations."""
    if path_str:
        p = Path(path_str)
        if p.is_file():
            return p
        p_base = (settings.BASE_DIR / p).resolve()
        if p_base.is_file():
            return p_base
        p_cwd = (Path.cwd() / p).resolve()
        if p_cwd.is_file():
            return p_cwd

    capsule_root = Path(settings.CAPSULES_DIR).resolve()
    for candidate in (
        capsule_root / scan_id / "v1" / filename,
        capsule_root / scan_id / filename,
        (settings.BASE_DIR / "generated_capsules" / scan_id / filename).resolve(),
    ):
        if candidate.is_file() and capsule_root in candidate.parents:
            return candidate
    return None


def _capsule_row(scan_id: str) -> dict:
    with get_db_connection() as conn:
        row = conn.execute("SELECT * FROM capsules WHERE scan_id = ?", (scan_id,)).fetchone()
    return dict(row) if row else {}


@router.get("/{scan_id}/capsule")
def get_capsule_data(scan_id: str, request: Request):
    """Retrieve the generated Dependency Exit Capsule data and preview."""
    enforce_scan_access(request, scan_id)

    row = _capsule_row(scan_id)
    json_path = _resolve_capsule_file(row.get("capsule_json_path"), scan_id, "capsule.json")
    md_path = _resolve_capsule_file(row.get("capsule_md_path"), scan_id, "capsule.md")

    if not json_path or not md_path:
        from app.capsule.generator import assemble_and_save_capsule

        try:
            json_path, md_path, _ = assemble_and_save_capsule(scan_id)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate capsule for scan '{scan_id}': {e}")

    try:
        capsule_json = json.loads(json_path.read_text(encoding="utf-8"))
        capsule_md = md_path.read_text(encoding="utf-8")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read capsule files for '{scan_id}': {e}")

    return {
        "scan_id": scan_id,
        "created_at": row.get("created_at") or capsule_json.get("scan_timestamp"),
        "capsule_version": capsule_json.get("capsule_version", 1),
        "capsule_sha256": capsule_json.get("capsule_sha256", ""),
        "previous_seal_sha256": capsule_json.get("previous_seal_sha256"),
        "capsule_data": capsule_json,
        "capsule_markdown": capsule_md,
        "download_json_url": f"/api/scans/{scan_id}/capsule/download/json",
        "download_md_url": f"/api/scans/{scan_id}/capsule/download/md",
    }


@router.get("/{scan_id}/agent-verifications")
def list_agent_verifications(scan_id: str, request: Request):
    """Advisory verdicts from the Slack-bridged agents for this capsule."""
    enforce_scan_access(request, scan_id)
    with get_db_connection() as conn:
        review = conn.execute(
            "SELECT digest, created_at FROM agent_reviews WHERE scan_id = ?", (scan_id,)
        ).fetchone()
    return {
        "scan_id": scan_id,
        "requested": review is not None,
        "digest": review["digest"] if review else None,
        "verifications": sync_replies(scan_id),
    }


@router.get("/{scan_id}/capsule/versions")
def list_capsule_versions(scan_id: str, request: Request):
    enforce_scan_access(request, scan_id)
    with get_db_connection() as conn:
        rows = conn.execute(
            "SELECT version, sha256, prev_sha256, created_at FROM capsule_versions WHERE scan_id = ? ORDER BY version DESC",
            (scan_id,),
        ).fetchall()
    return [dict(r) for r in rows]


@router.post("/{scan_id}/capsule/verify-hash")
def verify_capsule_hash(scan_id: str, request: Request):
    """Recompute the capsule's SHA-256 and check the version chain.

    An external auditor can verify a downloaded capsule.json without trusting
    this server: the digest covers the document with `capsule_sha256` blanked.
    """
    enforce_scan_access(request, scan_id)

    with get_db_connection() as conn:
        versions = conn.execute(
            "SELECT version, sha256, prev_sha256, capsule_json_path FROM capsule_versions "
            "WHERE scan_id = ? ORDER BY version ASC",
            (scan_id,),
        ).fetchall()

    if not versions:
        raise HTTPException(status_code=404, detail=f"No sealed capsule for scan '{scan_id}'.")

    chain_valid = True
    results = []
    previous = None
    for row in versions:
        path = _resolve_capsule_file(row["capsule_json_path"], scan_id, "capsule.json")
        stored = (row["sha256"] or "").lower()
        recomputed = ""
        matches = False
        if path:
            try:
                document = json.loads(path.read_text(encoding="utf-8"))
                unsigned = dict(document)
                unsigned["capsule_sha256"] = ""
                recomputed = hashlib.sha256(json.dumps(unsigned, indent=2).encode("utf-8")).hexdigest()
                matches = recomputed == stored
            except (OSError, ValueError):
                matches = False
        linked = previous is None or (row["prev_sha256"] or "").lower() == previous
        chain_valid = chain_valid and matches and linked
        results.append({
            "version": row["version"],
            "stored_sha256": stored,
            "recomputed_sha256": recomputed,
            "file_matches": matches,
            "prev_sha256": row["prev_sha256"],
            "chain_link_valid": linked,
        })
        previous = stored

    latest = results[-1]
    return {
        "scan_id": scan_id,
        "valid": chain_valid,
        "version": latest["version"],
        "stored_sha256": latest["stored_sha256"],
        "recomputed_sha256": latest["recomputed_sha256"],
        "versions": results,
    }


@router.get("/{scan_id}/capsule/download/json")
def download_capsule_json(scan_id: str, request: Request):
    """Download capsule.json file."""
    enforce_scan_access(request, scan_id)
    row = _capsule_row(scan_id)
    json_path = _resolve_capsule_file(row.get("capsule_json_path"), scan_id, "capsule.json")
    if not json_path:
        from app.capsule.generator import assemble_and_save_capsule

        try:
            json_path, _, _ = assemble_and_save_capsule(scan_id)
        except Exception:
            raise HTTPException(status_code=404, detail="Capsule JSON not found.")
    return FileResponse(path=str(json_path), filename="capsule.json", media_type="application/json")


@router.get("/{scan_id}/capsule/download/md")
def download_capsule_md(scan_id: str, request: Request):
    """Download capsule.md file."""
    enforce_scan_access(request, scan_id)
    row = _capsule_row(scan_id)
    md_path = _resolve_capsule_file(row.get("capsule_md_path"), scan_id, "capsule.md")
    if not md_path:
        from app.capsule.generator import assemble_and_save_capsule

        try:
            _, md_path, _ = assemble_and_save_capsule(scan_id)
        except Exception:
            raise HTTPException(status_code=404, detail="Capsule Markdown not found.")
    return FileResponse(path=str(md_path), filename="capsule.md", media_type="text/markdown")
