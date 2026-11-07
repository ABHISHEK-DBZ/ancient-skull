import json
import time
from fastapi import APIRouter, HTTPException, Request
from app.core.auth import enforce_scan_access
from app.core.clock import iso_now
from app.database import get_db_connection
from app.models.schemas import VerificationRequest
from app.verification.engine import run_verification_pipeline
from app.capsule.generator import assemble_and_save_capsule
from app.switch.client import notify_milestone

router = APIRouter(prefix="/api/scans", tags=["Verification"])

@router.post("/{scan_id}/verify")
def verify_candidate_dependency(scan_id: str, req: VerificationRequest, request: Request):
    """
    Execute the independent 10-point verification engine for a proposed replacement.
    Records actual evidence, command runs, and assigns verified statuses.
    """
    enforce_scan_access(request, scan_id)
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # 1. Fetch scan
        cursor.execute("SELECT repo_path, local_path FROM scans WHERE scan_id = ?", (scan_id,))
        scan_row = cursor.fetchone()
        if not scan_row:
            raise HTTPException(status_code=404, detail="Scan not found")
        repo_path = scan_row["local_path"] or scan_row["repo_path"]
        if not repo_path or str(repo_path).startswith(("http://", "https://", "git@")):
            raise HTTPException(status_code=400, detail="This scan has no local checkout. Re-run the scan to verify dependencies.")

        # 2. Fetch target dependency AST usages
        cursor.execute("""
            SELECT ast_usage_json FROM dependencies WHERE scan_id = ? AND package_name = ?
        """, (scan_id, req.package_name))
        dep_row = cursor.fetchone()
        if not dep_row:
            raise HTTPException(status_code=404, detail=f"Dependency '{req.package_name}' not found")
        
        ast_usages = json.loads(dep_row["ast_usage_json"]) if dep_row["ast_usage_json"] else []

        # 3. Fetch AI proposal if exists
        cursor.execute("""
            SELECT recommendation_json FROM ai_recommendations WHERE scan_id = ? AND package_name = ?
        """, (scan_id, req.package_name))
        ai_row = cursor.fetchone()
        ai_proposal = json.loads(ai_row["recommendation_json"]) if ai_row else None

    # Run verification pipeline
    report = run_verification_pipeline(
        repo_path=repo_path,
        original_package=req.package_name,
        candidate_package=req.candidate_package,
        ast_usages=ast_usages,
        ai_proposal=ai_proposal,
        run_live_tests=req.run_live_tests
    )

    # Persist check results in DB
    with get_db_connection() as conn:
        cursor = conn.cursor()
        # Clear previous verification checks for this package in this scan
        cursor.execute("DELETE FROM verification_runs WHERE scan_id = ? AND package_name = ?", (scan_id, req.package_name))
        
        for chk in report.checks:
            cursor.execute("""
                INSERT INTO verification_runs
                (scan_id, package_name, check_name, status, evidence, error_details, command_executed, elapsed_seconds, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                scan_id,
                req.package_name,
                chk.check_name,
                chk.status,
                chk.evidence,
                chk.error_details,
                chk.command_executed,
                chk.elapsed_seconds,
                iso_now()
            ))
        conn.commit()

    # Re-assemble updated capsule
    assemble_and_save_capsule(scan_id)

    notify_milestone(
        f"Verification {req.package_name} -> {req.candidate_package} in {scan_id}: "
        f"confidence {report.confidence_score}%, {sum(1 for c in report.checks if c.status == 'PASS')}/{len(report.checks)} passed."
    )

    return report.to_dict()

@router.get("/{scan_id}/verifications")
def list_verification_checks(scan_id: str, request: Request):
    """List all verification checks recorded for a given scan."""
    enforce_scan_access(request, scan_id)
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM verification_runs WHERE scan_id = ? ORDER BY id ASC
        """, (scan_id,))
        rows = [dict(r) for r in cursor.fetchall()]
        return rows
