import json
from fastapi import APIRouter, HTTPException, Request, Response
from app.core.auth import enforce_scan_access
from app.core.clock import iso_now
from app.database import get_db_connection
from app.models.schemas import PlanRequest
from app.planner.implementation_planner import generate_implementation_plan
from app.capsule.generator import assemble_and_save_capsule
from app.switch.client import notify_milestone

router = APIRouter(prefix="/api/scans", tags=["Planner"])

@router.post("/{scan_id}/plan")
def create_implementation_plan(scan_id: str, req: PlanRequest, request: Request):
    """
    Generate an evidence-backed 15-point implementation plan and AI-agent prompt.
    Enabled only after explicit developer approval.
    """
    enforce_scan_access(request, scan_id)
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # 1. Fetch approval status
        cursor.execute("""
            SELECT decision, notes FROM approval_decisions WHERE scan_id = ? AND package_name = ?
        """, (scan_id, req.package_name))
        app_row = cursor.fetchone()
        
        if not app_row or app_row["decision"] != "APPROVED":
            raise HTTPException(status_code=403, detail="Implementation plans require explicit developer approval for the migration proposal.")

        dev_notes = app_row["notes"]

        # 2. Fetch AST usages
        cursor.execute("SELECT ast_usage_json FROM dependencies WHERE scan_id = ? AND package_name = ?", (scan_id, req.package_name))
        dep_row = cursor.fetchone()
        if not dep_row:
            raise HTTPException(status_code=404, detail=f"Dependency '{req.package_name}' not found")
        ast_usages = json.loads(dep_row["ast_usage_json"]) if dep_row["ast_usage_json"] else []

        # 3. Fetch AI recommendation
        cursor.execute("SELECT recommendation_json FROM ai_recommendations WHERE scan_id = ? AND package_name = ?", (scan_id, req.package_name))
        ai_row = cursor.fetchone()
        ai_proposal = json.loads(ai_row["recommendation_json"]) if ai_row else None

        # 4. Fetch verification runs
        cursor.execute("SELECT * FROM verification_runs WHERE scan_id = ? AND package_name = ?", (scan_id, req.package_name))
        ver_rows = [dict(r) for r in cursor.fetchall()]

    # Generate plan
    plan_report = generate_implementation_plan(
        scan_id=scan_id,
        target_package=req.package_name,
        candidate_package=req.candidate_package,
        ast_usages=ast_usages,
        ai_proposal=ai_proposal,
        verification_checks=ver_rows,
        developer_notes=dev_notes
    )

    # Persist in DB
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO implementation_plans
            (scan_id, package_name, plan_json, plan_md, agent_prompt, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            scan_id,
            req.package_name,
            json.dumps(plan_report.plan_dict),
            plan_report.plan_markdown,
            plan_report.ai_agent_prompt,
            iso_now()
        ))
        conn.commit()

    # Re-assemble capsule to include implementation plan reference
    assemble_and_save_capsule(scan_id)

    notify_milestone(
        f"15-Point Implementation Plan generated for {req.package_name} -> {req.candidate_package} in {scan_id}."
    )

    return plan_report.to_dict()

@router.get("/{scan_id}/plans")
def list_implementation_plans(scan_id: str, request: Request):
    """Retrieve summary of all implementation plans generated for a scan."""
    enforce_scan_access(request, scan_id)
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT scan_id, package_name, created_at, plan_json FROM implementation_plans WHERE scan_id = ? ORDER BY created_at DESC
        """, (scan_id,))
        rows = []
        for r in cursor.fetchall():
            plan_obj = json.loads(r["plan_json"]) if r["plan_json"] else {}
            candidate = plan_obj.get("candidate_package") or plan_obj.get("replacement_package") or "Candidate"
            rows.append({
                "scan_id": r["scan_id"],
                "package_name": r["package_name"],
                "candidate_package": candidate,
                "created_at": r["created_at"],
                "objective": plan_obj.get("objective", f"Migrate {r['package_name']} to {candidate}"),
                "files_count": len(plan_obj.get("files_likely_to_change", [])),
                "steps_count": len(plan_obj.get("ordered_implementation_steps", [])),
                "checks_count": len(plan_obj.get("verification_checklist", []))
            })
        return rows

@router.get("/{scan_id}/plan/{package_name}")
def get_implementation_plan(scan_id: str, package_name: str, request: Request):
    """Retrieve existing implementation plan and AI prompt for a package."""
    enforce_scan_access(request, scan_id)
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM implementation_plans WHERE scan_id = ? AND package_name = ?
        """, (scan_id, package_name))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"No implementation plan found for '{package_name}'")

        return {
            "scan_id": row["scan_id"],
            "package_name": row["package_name"],
            "plan_data": json.loads(row["plan_json"]),
            "plan_markdown": row["plan_md"],
            "ai_agent_prompt": row["agent_prompt"],
            "created_at": row["created_at"]
        }

@router.get("/{scan_id}/plan/{package_name}/download")
def download_implementation_plan(scan_id: str, package_name: str, request: Request, format: str = "md"):
    """Download the implementation plan as Markdown or JSON."""
    enforce_scan_access(request, scan_id)
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM implementation_plans WHERE scan_id = ? AND package_name = ?
        """, (scan_id, package_name))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"No implementation plan found for '{package_name}'")

        if format == "json":
            return Response(
                content=row["plan_json"],
                media_type="application/json",
                headers={"Content-Disposition": f"attachment; filename=plan_{package_name}.json"}
            )
        else:
            return Response(
                content=row["plan_md"],
                media_type="text/markdown",
                headers={"Content-Disposition": f"attachment; filename=plan_{package_name}.md"}
            )
