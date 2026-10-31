import json
from fastapi import APIRouter, HTTPException, Request
from app.core.auth import enforce_scan_access
from app.database import get_db_connection

router = APIRouter(prefix="/api/scans", tags=["Dependencies"])

@router.get("/{scan_id}/dependencies/{package_name}")
def get_dependency_details(scan_id: str, package_name: str, request: Request):
    """Retrieve full details, AST usage locations, metadata, and verification state for a dependency."""
    enforce_scan_access(request, scan_id)
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # 1. Fetch dependency
        cursor.execute("""
            SELECT * FROM dependencies WHERE scan_id = ? AND package_name = ?
        """, (scan_id, package_name))
        dep = cursor.fetchone()
        if not dep:
            raise HTTPException(status_code=404, detail=f"Dependency '{package_name}' not found for scan '{scan_id}'")

        # 2. Fetch AI recommendation if available
        cursor.execute("""
            SELECT * FROM ai_recommendations WHERE scan_id = ? AND package_name = ?
        """, (scan_id, package_name))
        ai_row = cursor.fetchone()
        ai_recommendation = None
        if ai_row:
            ai_recommendation = {
                "candidate_replacement": ai_row["candidate_replacement"],
                "model_name": ai_row["model_name"],
                "proposal": json.loads(ai_row["recommendation_json"]),
                "created_at": ai_row["created_at"]
            }

        # 3. Fetch verification runs
        cursor.execute("""
            SELECT * FROM verification_runs WHERE scan_id = ? AND package_name = ? ORDER BY id ASC
        """, (scan_id, package_name))
        ver_rows = cursor.fetchall()
        verification_checks = [dict(vr) for vr in ver_rows]

        # 4. Fetch approval decision
        cursor.execute("""
            SELECT * FROM approval_decisions WHERE scan_id = ? AND package_name = ?
        """, (scan_id, package_name))
        app_row = cursor.fetchone()
        approval = dict(app_row) if app_row else None

        # 5. Fetch implementation plan
        cursor.execute("""
            SELECT * FROM implementation_plans WHERE scan_id = ? AND package_name = ?
        """, (scan_id, package_name))
        plan_row = cursor.fetchone()
        plan_data = None
        if plan_row:
            plan_data = {
                "plan_data": json.loads(plan_row["plan_json"]),
                "plan_markdown": plan_row["plan_md"],
                "ai_agent_prompt": plan_row["agent_prompt"],
                "created_at": plan_row["created_at"]
            }

        return {
            "scan_id": scan_id,
            "package_name": dep["package_name"],
            "declared_version": dep["declared_version"],
            "category": dep["category"],
            "risk_score": dep["risk_score"],
            "risk_breakdown": json.loads(dep["risk_breakdown_json"]) if dep["risk_breakdown_json"] else {},
            "pypi_metadata": json.loads(dep["pypi_metadata_json"]) if dep["pypi_metadata_json"] else {},
            "ast_usages": json.loads(dep["ast_usage_json"]) if dep["ast_usage_json"] else [],
            "ai_recommendation": ai_recommendation,
            "verification_checks": verification_checks,
            "approval": approval,
            "implementation_plan": plan_data
        }
