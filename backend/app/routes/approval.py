import time
from fastapi import APIRouter, HTTPException, Request
from app.core.auth import enforce_scan_access
from app.core.clock import iso_now
from app.database import get_db_connection
from app.models.schemas import ApprovalRequest
from app.capsule.generator import assemble_and_save_capsule

router = APIRouter(prefix="/api/scans", tags=["Approval"])

@router.post("/{scan_id}/approval")
def record_developer_approval(scan_id: str, req: ApprovalRequest, request: Request):
    """
    Record explicit developer approval or rejection for a proposed migration.
    Stores decision, timestamp, and notes. Re-assembles the capsule.
    """
    decision_clean = req.decision.upper().strip()
    if decision_clean not in ["APPROVED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Decision must be 'APPROVED' or 'REJECTED'")

    enforce_scan_access(request, scan_id)
    now = iso_now()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Verify dependency exists in scan
        cursor.execute("SELECT id FROM dependencies WHERE scan_id = ? AND package_name = ?", (scan_id, req.package_name))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail=f"Dependency '{req.package_name}' not found for scan '{scan_id}'")

        cursor.execute("""
            INSERT OR REPLACE INTO approval_decisions (scan_id, package_name, decision, notes, decided_at)
            VALUES (?, ?, ?, ?, ?)
        """, (scan_id, req.package_name, decision_clean, req.notes or "", now))
        cursor.execute("""
            INSERT INTO approval_history (scan_id, package_name, decision, notes, decided_at)
            VALUES (?, ?, ?, ?, ?)
        """, (scan_id, req.package_name, decision_clean, req.notes or "", now))
        conn.commit()

    # Re-assemble capsule
    assemble_and_save_capsule(scan_id)

    return {
        "scan_id": scan_id,
        "package_name": req.package_name,
        "decision": decision_clean,
        "notes": req.notes,
        "message": f"Migration decision '{decision_clean}' recorded successfully."
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
