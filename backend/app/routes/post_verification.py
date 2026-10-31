import json
import time
from pathlib import Path
from fastapi import APIRouter, HTTPException, Request
from app.core.auth import enforce_scan_access
from app.core.clock import iso_now
from app.core.security import is_safe_repo_path
from app.database import get_db_connection
from app.models.schemas import PostVerifyRequest
from app.post_verify.post_verifier import run_post_implementation_verification
from app.capsule.generator import assemble_and_save_capsule

router = APIRouter(prefix="/api/scans", tags=["PostVerification"])

@router.post("/{scan_id}/post-verify")
def post_verify_working_copy(scan_id: str, req: PostVerifyRequest, request: Request):
    """
    Verify developer's modified working copy against the approved plan and baseline tests.
    """
    enforce_scan_access(request, scan_id)
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT repo_path, local_path FROM scans WHERE scan_id = ?", (scan_id,))
        scan_row = cursor.fetchone()
        if not scan_row:
            raise HTTPException(status_code=404, detail="Scan not found")
        orig_repo = scan_row["local_path"] or scan_row["repo_path"]

    if not is_safe_repo_path(req.working_copy_path):
        raise HTTPException(status_code=400, detail=f"Working copy is not in an allowed scan root: {req.working_copy_path}")

    working_path = Path(req.working_copy_path).resolve()

    # Run post verification
    result = run_post_implementation_verification(
        scan_id=scan_id,
        original_repo=orig_repo,
        working_copy=working_path,
        target_package=req.target_package,
        candidate_package=req.candidate_package
    )

    # Persist in DB
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO post_verifications
            (scan_id, working_copy_path, diff_summary, status, checks_json, report_md, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            scan_id,
            str(working_path),
            result.diff_summary,
            result.status,
            json.dumps(result.checks),
            result.report_markdown,
            iso_now()
        ))
        conn.commit()

    # Re-assemble capsule
    assemble_and_save_capsule(scan_id)

    return result.to_dict()

@router.get("/{scan_id}/post-verify")
def get_post_verifications(scan_id: str, request: Request):
    """List all post-implementation verification runs for a scan."""
    enforce_scan_access(request, scan_id)
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM post_verifications WHERE scan_id = ? ORDER BY id DESC
        """, (scan_id,))
        rows = cursor.fetchall()
        
        runs = []
        for r in rows:
            runs.append({
                "id": r["id"],
                "scan_id": r["scan_id"],
                "working_copy_path": r["working_copy_path"],
                "diff_summary": r["diff_summary"],
                "status": r["status"],
                "checks": json.loads(r["checks_json"]),
                "report_markdown": r["report_md"],
                "created_at": r["created_at"]
            })
        return runs
