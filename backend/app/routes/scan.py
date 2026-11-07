import json
import shutil
import subprocess
import time
import uuid
from pathlib import Path
from typing import Dict, Any, List

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request

from app.ai.gemma_client import GemmaClient
from app.capsule.generator import assemble_and_save_capsule
from app.config import settings
from app.core.auth import enforce_scan_access, get_session
from app.core.clock import iso_now
from app.core.security import is_safe_repo_path, redact_secrets
from app.database import get_db_connection
from app.metadata.pypi_client import fetch_pypi_metadata
from app.metadata.risk_scorer import calculate_risk_score
from app.models.schemas import ScanProgressResponse, StartScanRequest, StartScanResponse
from app.switch.client import notify_milestone
from app.switch.review import request_review
from app.scanner.ast_analyzer import analyze_repository_ast
from app.scanner.discovery import scan_declared_dependencies
from app.scanner.git_fetcher import fetch_git_repository

router = APIRouter(prefix="/api/scans", tags=["Scans"])


def _set_progress(scan_id: str, step: str, pct: int, status: str = "scanning", error: str | None = None) -> None:
    with get_db_connection() as conn:
        conn.execute(
            "UPDATE scans SET status = ?, progress_pct = ?, current_step = ?, error_message = ? WHERE scan_id = ?",
            (status, pct, step, error, scan_id),
        )
        conn.commit()


def execute_scan_pipeline(scan_id: str, repo_path_str: str, run_ai: bool = False):
    """Background worker executing the complete scan pipeline."""
    repo = Path(repo_path_str).resolve()

    try:
        _set_progress(scan_id, "1/5: Discovering declared dependencies...", 15)
        declared_deps = scan_declared_dependencies(repo)

        _set_progress(scan_id, "2/5: Performing static AST code usage analysis...", 35)
        usages_by_pkg, observed_pkgs, syntax_errors = analyze_repository_ast(repo)

        _set_progress(scan_id, "3/5: Querying package metadata & calculating risk scores...", 60)
        all_pkg_names = set(declared_deps.keys()).union(observed_pkgs)

        dep_records = []
        with get_db_connection() as conn:
            cursor = conn.cursor()

            for pkg in all_pkg_names:
                decl_info = declared_deps.get(pkg)
                is_declared = decl_info is not None
                is_observed = pkg in usages_by_pkg

                if is_declared and is_observed:
                    category = decl_info.category
                elif is_declared and not is_observed:
                    category = "candidate_unused"
                elif not is_declared and is_observed:
                    category = "candidate_undeclared"
                else:
                    category = "declared"

                pinned_ver = decl_info.version_spec if decl_info else None
                meta = fetch_pypi_metadata(pkg, pinned_version=pinned_ver)
                risk_report = calculate_risk_score(meta, pinned_version=pinned_ver)

                usages = [u.to_dict() for u in usages_by_pkg.get(pkg, [])]

                cursor.execute("""
                    INSERT OR REPLACE INTO dependencies
                    (scan_id, package_name, declared_version, category, risk_score, risk_breakdown_json, pypi_metadata_json, ast_usage_json, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    scan_id,
                    pkg,
                    pinned_ver,
                    category,
                    risk_report.overall_score,
                    json.dumps(risk_report.to_dict()),
                    json.dumps(meta),
                    json.dumps(usages),
                    iso_now(),
                ))
                dep_records.append({
                    "package_name": pkg,
                    "risk_score": risk_report.overall_score,
                    "level": risk_report.level,
                    "category": category,
                    "usages": usages,
                })
            conn.commit()

        if run_ai:
            _set_progress(scan_id, "4/5: Requesting migration plans from Gemma 4...", 80)
            gemma = GemmaClient()
            configured, _ = gemma.is_configured()
            if configured:
                high_risk = [d for d in dep_records if d["risk_score"] >= 40.0]
                if not high_risk and dep_records:
                    high_risk = sorted(dep_records, key=lambda x: x["risk_score"], reverse=True)[:1]

                for target in high_risk[:2]:
                    pname = target["package_name"]
                    try:
                        proposal = gemma.plan_migration(
                            package_name=pname,
                            pinned_version=None,
                            risk_summary=f"Risk Score {target['risk_score']} ({target['level']})",
                            ast_usages=target["usages"],
                        )
                        with get_db_connection() as conn:
                            conn.execute("""
                                INSERT OR REPLACE INTO ai_recommendations
                                (scan_id, package_name, candidate_replacement, model_name, recommendation_json, created_at)
                                VALUES (?, ?, ?, ?, ?, ?)
                            """, (
                                scan_id,
                                pname,
                                proposal.candidate_replacement,
                                gemma.model,
                                proposal.json(),
                                iso_now(),
                            ))
                            conn.commit()
                    except Exception as exc:
                        # AI is optional: keep the deterministic scan usable, but
                        # leave the sanitized reason on the progress record.
                        _set_progress(scan_id, f"4/5: AI proposal skipped ({redact_secrets(str(exc))[:160]})", 84)
        else:
            _set_progress(scan_id, "4/5: Skipping AI migration planning (disabled)...", 80)

        _set_progress(scan_id, "5/5: Assembling Dependency Exit Capsule...", 95)
        _, _, sealed = assemble_and_save_capsule(scan_id)

        summary = {
            "total_dependencies": len(all_pkg_names),
            "declared_count": len(declared_deps),
            "syntax_errors": syntax_errors,
            "critical_risk_count": sum(1 for d in dep_records if d["level"] == "CRITICAL"),
            "high_risk_count": sum(1 for d in dep_records if d["level"] == "HIGH"),
            "completed_at": time.time(),
        }
        with get_db_connection() as conn:
            conn.execute(
                "UPDATE scans SET status = 'completed', summary_json = ?, progress_pct = 100, current_step = ?, error_message = NULL WHERE scan_id = ?",
                (json.dumps(summary), "Scan and capsule generation complete.", scan_id),
            )
            conn.commit()

        notify_milestone(
            f"Exit Capsule sealed for {scan_id}: {summary['total_dependencies']} dependencies, "
            f"{summary['critical_risk_count']} critical / {summary['high_risk_count']} high risk."
        )
        if settings.SWITCH_AGENT_REVIEW_ENABLED:
            request_review(scan_id, getattr(sealed, "capsule_sha256", ""), summary)

    except Exception as exc:
        message = redact_secrets(str(exc))
        with get_db_connection() as conn:
            conn.execute(
                "UPDATE scans SET status = 'failed', error_message = ?, progress_pct = 100, current_step = ? WHERE scan_id = ?",
                (message, f"Scan failed: {message}", scan_id),
            )
            conn.commit()


@router.post("/start", response_model=StartScanResponse)
def start_scan(req: StartScanRequest, request: Request, background_tasks: BackgroundTasks):
    """Start scanning a local repository or a public GitHub repository URL."""
    target_repo = req.repo_path.strip()
    is_git_url = any(target_repo.startswith(p) for p in ("http://", "https://", "git@", "github.com"))
    session = get_session(request)
    owner_id = str(session.get("github_id")) if session else None
    scan_id = f"scan_{time.strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"

    if is_git_url:
        if not target_repo.startswith("http") and not target_repo.startswith("git@"):
            target_repo = "https://" + target_repo
        parts = target_repo.rstrip("/").replace(".git", "").split("/")
        repo_name = f"{parts[-2]}_{parts[-1]}" if len(parts) >= 2 else parts[-1]

        # Fresh, per-scan workspace: no stale code and no cross-user collision.
        workspace_dir = Path(settings.TEMP_WORKSPACES_DIR) / f"git_{owner_id or 'local'}_{repo_name}_{scan_id}"
        workspace_dir.parent.mkdir(parents=True, exist_ok=True)
        try:
            fetch_git_repository(target_repo, workspace_dir)
        except HTTPException:
            shutil.rmtree(workspace_dir, ignore_errors=True)
            raise
        except Exception as exc:
            shutil.rmtree(workspace_dir, ignore_errors=True)
            raise HTTPException(status_code=400, detail=f"Git clone error: {redact_secrets(str(exc))}")

        actual_path = str(workspace_dir.resolve())
        stored_repo = target_repo
    else:
        if not is_safe_repo_path(target_repo):
            raise HTTPException(status_code=400, detail=f"Repository path is not allowed: {req.repo_path}")
        actual_path = str(Path(target_repo).resolve())
        stored_repo = actual_path

    with get_db_connection() as conn:
        conn.execute("""
            INSERT INTO scans (scan_id, repo_path, local_path, status, created_at, owner_id, progress_pct, current_step)
            VALUES (?, ?, ?, 'scanning', ?, ?, 5, ?)
        """, (scan_id, stored_repo, actual_path, iso_now(), owner_id, "Initializing scan pipeline..."))
        conn.commit()

    background_tasks.add_task(execute_scan_pipeline, scan_id=scan_id, repo_path_str=actual_path, run_ai=req.run_ai)

    return StartScanResponse(
        scan_id=scan_id,
        status="scanning",
        repo_path=req.repo_path,
        message="Scan initiated successfully.",
    )


@router.get("/{scan_id}/progress", response_model=ScanProgressResponse)
def get_scan_progress(scan_id: str, request: Request):
    enforce_scan_access(request, scan_id)
    with get_db_connection() as conn:
        row = conn.execute(
            "SELECT status, progress_pct, current_step, error_message FROM scans WHERE scan_id = ?",
            (scan_id,),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Scan not found")
    status = row["status"]
    pct = row["progress_pct"] if row["progress_pct"] is not None else (100 if status in ["completed", "failed"] else 50)
    return ScanProgressResponse(
        scan_id=scan_id,
        status=status,
        progress_pct=pct,
        current_step=row["current_step"] or f"Status: {status}",
        error_message=row["error_message"],
    )


@router.get("", include_in_schema=False)
@router.get("/")
def list_scans(request: Request):
    """List scans visible to the caller."""
    session = get_session(request)
    with get_db_connection() as conn:
        if settings.REQUIRE_AUTH:
            owner_id = str(session.get("github_id")) if session else None
            rows = conn.execute(
                "SELECT * FROM scans WHERE owner_id = ? ORDER BY created_at DESC",
                (owner_id,),
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM scans ORDER BY created_at DESC").fetchall()

        result = []
        for r in rows:
            summary = json.loads(r["summary_json"]) if r["summary_json"] else {}
            result.append({
                "scan_id": r["scan_id"],
                "repo_path": r["repo_path"],
                "status": r["status"],
                "created_at": r["created_at"],
                "summary": summary,
                "error_message": r["error_message"],
            })
        return result


def _verification_status(conn, scan_id: str, package_name: str) -> str:
    rows = conn.execute(
        "SELECT status FROM verification_runs WHERE scan_id = ? AND package_name = ?",
        (scan_id, package_name),
    ).fetchall()
    statuses = {r["status"] for r in rows}
    if not statuses:
        return "NOT_VERIFIED"
    if "FAIL" in statuses or "AI_CLAIM_REJECTED" in statuses:
        return "FAILED"
    if "INCONCLUSIVE" in statuses or "UNVERIFIED" in statuses:
        return "INCONCLUSIVE"
    if statuses <= {"PASS", "NOT_RUN"} and "PASS" in statuses:
        return "VERIFIED"
    return "NOT_RUN"


@router.get("/{scan_id}")
def get_scan_details(scan_id: str, request: Request):
    enforce_scan_access(request, scan_id)
    with get_db_connection() as conn:
        scan_row = conn.execute("SELECT * FROM scans WHERE scan_id = ?", (scan_id,)).fetchone()
        if not scan_row:
            raise HTTPException(status_code=404, detail="Scan not found")

        dep_rows = conn.execute(
            "SELECT * FROM dependencies WHERE scan_id = ? ORDER BY risk_score DESC", (scan_id,)
        ).fetchall()

        dependencies = []
        for d in dep_rows:
            dependencies.append({
                "package_name": d["package_name"],
                "declared_version": d["declared_version"],
                "category": d["category"],
                "risk_score": d["risk_score"],
                "risk_breakdown": json.loads(d["risk_breakdown_json"]) if d["risk_breakdown_json"] else {},
                "pypi_metadata": json.loads(d["pypi_metadata_json"]) if d["pypi_metadata_json"] else {},
                "usages_count": len(json.loads(d["ast_usage_json"])) if d["ast_usage_json"] else 0,
                "verification_status": _verification_status(conn, scan_id, d["package_name"]),
            })

        return {
            "scan_id": scan_row["scan_id"],
            "repo_path": scan_row["repo_path"],
            "status": scan_row["status"],
            "created_at": scan_row["created_at"],
            "summary": json.loads(scan_row["summary_json"]) if scan_row["summary_json"] else {},
            "dependencies": dependencies,
        }


@router.delete("/{scan_id}")
def delete_scan(scan_id: str, request: Request):
    info = enforce_scan_access(request, scan_id)
    with get_db_connection() as conn:
        row = conn.execute("SELECT local_path FROM scans WHERE scan_id = ?", (scan_id,)).fetchone()
        for table in (
            "scans", "dependencies", "ai_recommendations", "verification_runs",
            "approval_decisions", "approval_history", "capsules", "capsule_versions",
            "implementation_plans", "post_verifications", "agent_reviews", "agent_verifications",
        ):
            conn.execute(f"DELETE FROM {table} WHERE scan_id = ?", (scan_id,))
        conn.commit()

    capsule_dir = Path(settings.CAPSULES_DIR) / scan_id
    if capsule_dir.exists():
        shutil.rmtree(str(capsule_dir), ignore_errors=True)

    local_path = row["local_path"] if row else None
    if local_path:
        workspace = Path(local_path).resolve()
        temp_root = Path(settings.TEMP_WORKSPACES_DIR).resolve()
        if workspace != temp_root and temp_root in workspace.parents:
            shutil.rmtree(str(workspace), ignore_errors=True)

    return {"message": f"Scan {scan_id} and associated artifacts deleted successfully."}
