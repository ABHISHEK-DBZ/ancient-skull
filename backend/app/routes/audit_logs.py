from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Request

from app.core.auth import enforce_scan_access, get_session
from app.database import get_db_connection

router = APIRouter(prefix="/api", tags=["Audit"])


def _timestamp(value: Any) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return datetime.fromisoformat(str(value)).timestamp()
    except (TypeError, ValueError):
        return 0.0


def _iso(value: Any) -> str:
    stamp = _timestamp(value)
    if not stamp:
        return str(value or "")
    return datetime.fromtimestamp(stamp, timezone.utc).isoformat(timespec="seconds")


def _visible_scans(conn, request: Request, scan_id: Optional[str]) -> set[str]:
    session = get_session(request)
    owner_id = str(session.get("github_id")) if session else None
    if scan_id:
        enforce_scan_access(request, scan_id)
        return {scan_id}
    visible = set()
    for row in conn.execute("SELECT scan_id, owner_id FROM scans").fetchall():
        if row[1] is None or (owner_id and str(row[1]) == owner_id):
            visible.add(row[0])
    return visible


@router.get("/audit-logs")
def list_audit_logs(request: Request, scan_id: Optional[str] = None, limit: int = 200):
    """Chronological, read-only event stream built from the real tables."""
    events: list[dict[str, Any]] = []

    with get_db_connection() as conn:
        visible = _visible_scans(conn, request, scan_id)
        cursor = conn.cursor()
        cursor.row_factory = None

        params = (scan_id,) if scan_id else ()

        def rows(sql: str):
            for row in cursor.execute(sql, params).fetchall():
                if row[0] in visible:
                    yield row

        for row in rows("SELECT scan_id, created_at, status, repo_path FROM scans" + (" WHERE scan_id = ?" if scan_id else "")):
            events.append({
                "type": "scan",
                "scan_id": row[0],
                "timestamp": _iso(row[1]),
                "title": "Scan created",
                "detail": f"{row[3]} ({row[2]})",
            })

        for row in rows(
            "SELECT scan_id, package_name, created_at, candidate_replacement, model_name "
            "FROM ai_recommendations" + (" WHERE scan_id = ?" if scan_id else "")
        ):
            events.append({
                "type": "ai_recommendation",
                "scan_id": row[0],
                "package_name": row[1],
                "timestamp": _iso(row[2]),
                "title": "AI migration proposal",
                "detail": f"{row[1]} -> {row[3]} ({row[4]})",
            })

        for row in rows(
            "SELECT scan_id, package_name, created_at, check_name, status, evidence "
            "FROM verification_runs" + (" WHERE scan_id = ?" if scan_id else "")
        ):
            events.append({
                "type": "verification",
                "scan_id": row[0],
                "package_name": row[1],
                "timestamp": _iso(row[2]),
                "title": f"Verification: {row[3]}",
                "detail": f"{row[1]}: {row[4]} - {row[5] or ''}",
                "status": row[4],
            })

        for row in rows(
            "SELECT scan_id, created_at, version, sha256, prev_sha256 FROM capsule_versions"
            + (" WHERE scan_id = ?" if scan_id else "")
        ):
            events.append({
                "type": "capsule_sealed",
                "scan_id": row[0],
                "timestamp": _iso(row[1]),
                "title": f"Capsule v{row[2]} sealed",
                "detail": f"SHA-256 {row[3]}",
                "capsule_version": row[2],
                "capsule_sha256": row[3],
                "prev_sha256": row[4],
            })

        for row in rows(
            "SELECT scan_id, package_name, decided_at, decision, notes, capsule_sha256, capsule_version "
            "FROM approval_history" + (" WHERE scan_id = ?" if scan_id else "")
        ):
            events.append({
                "type": "approval",
                "scan_id": row[0],
                "package_name": row[1],
                "timestamp": _iso(row[2]),
                "title": f"Developer {row[3].lower()}",
                "detail": f"{row[1]}: {row[4] or ''}",
                "capsule_sha256": row[5],
                "capsule_version": row[6],
            })

    events.sort(key=lambda event: _timestamp(event["timestamp"]), reverse=True)
    return events[: max(1, min(limit, 1000))]
