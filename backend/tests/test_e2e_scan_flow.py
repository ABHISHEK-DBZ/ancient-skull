import time
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from app.routes.scan import execute_scan_pipeline

client = TestClient(app)

def test_complete_e2e_workflow():
    fixture_dir = str((Path(__file__).parent / "fixtures" / "sample_project").resolve())

    # 1. Start scan
    resp = client.post("/api/scans/start", json={"repo_path": fixture_dir, "run_ai": False})
    assert resp.status_code == 200
    data = resp.json()
    scan_id = data["scan_id"]
    assert scan_id.startswith("scan_")

    # Directly run pipeline synchronously to test completion without background race
    execute_scan_pipeline(scan_id, fixture_dir, run_ai=False)

    # 2. Check progress
    prog_resp = client.get(f"/api/scans/{scan_id}/progress")
    assert prog_resp.status_code == 200
    assert prog_resp.json()["status"] == "completed"

    # 3. Get scan details
    details_resp = client.get(f"/api/scans/{scan_id}")
    assert details_resp.status_code == 200
    details = details_resp.json()
    assert len(details["dependencies"]) >= 3
    pkg_names = [d["package_name"] for d in details["dependencies"]]
    assert "requests" in pkg_names
    assert "pyyaml" in pkg_names

    # 4. Run verification pipeline
    ver_resp = client.post(f"/api/scans/{scan_id}/verify", json={
        "package_name": "requests",
        "candidate_package": "httpx",
        "run_live_tests": False
    })
    assert ver_resp.status_code == 200
    ver_data = ver_resp.json()
    assert len(ver_data["checks"]) == 10

    # 5. Developer approval is bound to the sealed capsule the reviewer saw
    capsule = client.get(f"/api/scans/{scan_id}/capsule").json()
    app_resp = client.post(f"/api/scans/{scan_id}/approval", json={
        "package_name": "requests",
        "decision": "APPROVED",
        "notes": "Approved migration from requests to httpx based on PyPI verification.",
        "capsule_sha256": capsule["capsule_sha256"],
        "capsule_version": capsule["capsule_version"],
    })
    assert app_resp.status_code == 200
    assert app_resp.json()["decision"] == "APPROVED"
    assert app_resp.json()["approved_capsule_sha256"] == capsule["capsule_sha256"]

    # 6. Generate Implementation Plan
    plan_resp = client.post(f"/api/scans/{scan_id}/plan", json={
        "package_name": "requests",
        "candidate_package": "httpx"
    })
    assert plan_resp.status_code == 200
    plan_data = plan_resp.json()
    assert "app.py" in plan_data["plan_data"]["files_likely_to_change"]
    assert "STRICT INSTRUCTIONS" in plan_data["ai_agent_prompt"]

    # 7. Get Capsule
    cap_resp = client.get(f"/api/scans/{scan_id}/capsule")
    assert cap_resp.status_code == 200
    cap_data = cap_resp.json()
    assert cap_data["capsule_data"]["scan_id"] == scan_id
    assert "# Dependency Exit Capsule" in cap_data["capsule_markdown"]

    # 8. Post-implementation verification on sample project
    post_resp = client.post(f"/api/scans/{scan_id}/post-verify", json={
        "working_copy_path": fixture_dir,
        "target_package": "requests",
        "candidate_package": "httpx"
    })
    assert post_resp.status_code == 200
    post_data = post_resp.json()
    assert "checks" in post_data
    assert len(post_data["checks"]) >= 3
