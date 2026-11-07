import re

from fastapi import APIRouter, HTTPException, Request
from app.core.auth import enforce_scan_access
from app.core.clock import iso_now
from app.database import get_db_connection
from app.models.schemas import ApprovalRequest
from app.capsule.generator import assemble_and_save_capsule
from app.switch.client import notify_milestone

router = APIRouter(prefix="/api/scans", tags=["Approval"])

_HEX64 = re.compile(r"^[0-9a-f]{64}$")


def _latest_seal(conn, scan_id: str):
    return conn.execute(
        "SELECT version, sha256 FROM capsule_versions WHERE scan_id = ? ORDER BY version DESC LIMIT 1",
        (scan_id,),
    ).fetchone()


@router.post("/{scan_id}/approval")
def record_developer_approval(scan_id: str, req: ApprovalRequest, request: Request):
    """
    Record explicit developer approval or rejection for a proposed migration.

    The approval is bound to the exact capsule version and SHA-256 the developer
    reviewed. A mismatch means the capsule changed after review, so the request
    is rejected with 409 and the caller must re-review.
    """
    decision_clean = req.decision.upper().strip()
    if decision_clean not in ["APPROVED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Decision must be 'APPROVED' or 'REJECTED'")

    approved_sha = req.capsule_sha256.strip().lower()
    if not _HEX64.match(approved_sha):
        raise HTTPException(status_code=400, detail="capsule_sha256 must be a 64-character hex digest")

    enforce_scan_access(request, scan_id)

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id FROM dependencies WHERE scan_id = ? AND package_name = ?",
            (scan_id, req.package_name),
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail=f"Dependency '{req.package_name}' not found for scan '{scan_id}'")
        seal = _latest_seal(conn, scan_id)

    if seal is None:
        # First approval on a scan whose capsule was never opened: seal it now.
        assemble_and_save_capsule(scan_id)
        with get_db_connection() as conn:
            seal = _latest_seal(conn, scan_id)

    if seal is None:
        raise HTTPException(status_code=500, detail=f"Could not seal a capsule for scan '{scan_id}'")

    active_sha = (seal["sha256"] or "").lower()
    if req.capsule_version != seal["version"] or approved_sha != active_sha:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Capsule changed since review. Re-open the capsule and approve again.",
                "reviewed_version": req.capsule_version,
                "active_version": seal["version"],
                "active_sha256": active_sha,
            },
        )

    now = iso_now()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO approval_decisions
                (scan_id, package_name, decision, notes, decided_at, capsule_sha256, capsule_version)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (scan_id, req.package_name, decision_clean, req.notes or "", now, approved_sha, req.capsule_version))
        cursor.execute("""
            INSERT INTO approval_history
                (scan_id, package_name, decision, notes, decided_at, capsule_sha256, capsule_version)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (scan_id, req.package_name, decision_clean, req.notes or "", now, approved_sha, req.capsule_version))
        conn.commit()

    # Re-seal with the approval_state included. This is a new version whose
    # previous_seal_sha256 points at the reviewed (and now approved) capsule.
    _, _, resealed = assemble_and_save_capsule(scan_id)

    notify_milestone(
        f"Approval {decision_clean} for {req.package_name} in {scan_id}: "
        f"reviewed v{req.capsule_version} {approved_sha[:12]}..., resealed v{resealed.capsule_version}."
    )

    return {
        "scan_id": scan_id,
        "package_name": req.package_name,
        "decision": decision_clean,
        "notes": req.notes,
        "approved_capsule_sha256": approved_sha,
        "approved_capsule_version": req.capsule_version,
        "resealed_capsule_sha256": resealed.capsule_sha256,
        "resealed_capsule_version": resealed.capsule_version,
        "message": f"Migration decision '{decision_clean}' recorded successfully.",
    }

@router.get("/{scan_id}/approval/{package_name}")
def get_approval_status(scan_id: str, package_name: str, request: Request):
    """Get the current approval status for a dependency in a scan."""
    enforce_scan_access(request, scan_id)
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM approval_decisions WHERE scan_id = ? AND package_name = ?
        """, (scan_id, package_name))
        row = cursor.fetchone()
        if not row:
            return {"scan_id": scan_id, "package_name": package_name, "decision": "PENDING"}
        return dict(row)
