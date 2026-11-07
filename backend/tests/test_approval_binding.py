import json
import shutil
import uuid
from pathlib import Path

from fastapi.testclient import TestClient

from app.core.clock import iso_now
from app.database import get_db_connection
from app.main import app

client = TestClient(app)


def _seed_scan() -> str:
    scan_id = f"scan_test_{uuid.uuid4().hex[:10]}"
    now = iso_now()
    with get_db_connection() as conn:
        conn.execute(
            "INSERT INTO scans (scan_id, repo_path, status, created_at) VALUES (?, ?, ?, ?)",
            (scan_id, "/tmp/test-repo", "completed", now),
        )
        conn.execute(
            "INSERT INTO dependencies (scan_id, package_name, declared_version, category, risk_score, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (scan_id, "requests", "==2.31.0", "declared", 10.0, now),
        )
        conn.commit()
    return scan_id


def _cleanup(scan_id: str) -> None:
    with get_db_connection() as conn:
        row = conn.execute(
            "SELECT capsule_json_path FROM capsule_versions WHERE scan_id = ? ORDER BY version DESC LIMIT 1",
            (scan_id,),
        ).fetchone()
        for table in ("capsule_versions", "capsules", "approval_decisions", "approval_history", "dependencies", "scans"):
            conn.execute(f"DELETE FROM {table} WHERE scan_id = ?", (scan_id,))
        conn.commit()
    if row and row["capsule_json_path"]:
        capsule_dir = Path(row["capsule_json_path"]).parent.parent
        if capsule_dir.name == scan_id:
            shutil.rmtree(capsule_dir, ignore_errors=True)


def _capsule(scan_id: str) -> dict:
    response = client.get(f"/api/scans/{scan_id}/capsule")
    assert response.status_code == 200
    return response.json()


def test_approval_rejects_stale_capsule():
    scan_id = _seed_scan()
    try:
        capsule = _capsule(scan_id)
        body = {
            "package_name": "requests",
            "decision": "APPROVED",
            "notes": "reviewed",
        }

        wrong_hash = client.post(
            f"/api/scans/{scan_id}/approval",
            json={**body, "capsule_sha256": "0" * 64, "capsule_version": capsule["capsule_version"]},
        )
        assert wrong_hash.status_code == 409

        wrong_version = client.post(
            f"/api/scans/{scan_id}/approval",
            json={**body, "capsule_sha256": capsule["capsule_sha256"], "capsule_version": capsule["capsule_version"] + 1},
        )
        assert wrong_version.status_code == 409

        malformed = client.post(
            f"/api/scans/{scan_id}/approval",
            json={**body, "capsule_sha256": "not-a-hash", "capsule_version": capsule["capsule_version"]},
        )
        assert malformed.status_code == 400
    finally:
        _cleanup(scan_id)


def test_approval_binds_and_reseals():
    scan_id = _seed_scan()
    try:
        capsule = _capsule(scan_id)
        response = client.post(
            f"/api/scans/{scan_id}/approval",
            json={
                "package_name": "requests",
                "decision": "APPROVED",
                "notes": "reviewed",
                "capsule_sha256": capsule["capsule_sha256"],
                "capsule_version": capsule["capsule_version"],
            },
        )
        assert response.status_code == 200
        result = response.json()
        assert result["approved_capsule_sha256"] == capsule["capsule_sha256"]
        assert result["approved_capsule_version"] == capsule["capsule_version"]
        assert result["resealed_capsule_version"] == capsule["capsule_version"] + 1

        status = client.get(f"/api/scans/{scan_id}/approval/requests").json()
        assert status["decision"] == "APPROVED"
        assert status["capsule_sha256"] == capsule["capsule_sha256"]
        assert status["capsule_version"] == capsule["capsule_version"]
    finally:
        _cleanup(scan_id)


def test_verify_hash_detects_tampering():
    scan_id = _seed_scan()
    try:
        capsule = _capsule(scan_id)
        verified = client.post(f"/api/scans/{scan_id}/capsule/verify-hash").json()
        assert verified["valid"] is True
        assert verified["stored_sha256"] == capsule["capsule_sha256"]

        with get_db_connection() as conn:
            row = conn.execute(
                "SELECT capsule_json_path FROM capsule_versions WHERE scan_id = ? ORDER BY version DESC LIMIT 1",
                (scan_id,),
            ).fetchone()
        path = Path(row["capsule_json_path"])
        document = json.loads(path.read_text(encoding="utf-8"))
        document["confidence_score"] = 1.0
        path.write_text(json.dumps(document, indent=2), encoding="utf-8")

        tampered = client.post(f"/api/scans/{scan_id}/capsule/verify-hash").json()
        assert tampered["valid"] is False
        assert tampered["versions"][-1]["file_matches"] is False
    finally:
        _cleanup(scan_id)
