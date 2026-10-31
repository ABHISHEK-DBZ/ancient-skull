import os
import json
import time
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List
from app.config import settings
from app.capsule.schema import ExitCapsuleData, CapsuleEvidenceItem
from app.capsule.markdown_builder import generate_capsule_markdown
from app.core.clock import iso_now
from app.database import get_db_connection


def _as_timestamp(value) -> float:
    try:
        return datetime.fromisoformat(str(value)).timestamp()
    except (TypeError, ValueError):
        try:
            return float(value)
        except (TypeError, ValueError):
            return time.time()

def assemble_and_save_capsule(scan_id: str) -> tuple[Path, Path, ExitCapsuleData]:
    """
    Assemble the complete Dependency Exit Capsule from database records,
    validate against schema, write capsule.json and capsule.md, and persist references.
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # 1. Fetch scan
        cursor.execute("SELECT * FROM scans WHERE scan_id = ?", (scan_id,))
        scan_row = cursor.fetchone()
        if not scan_row:
            raise ValueError(f"Scan {scan_id} not found")
        
        repo_path = scan_row["repo_path"]
        created_at = _as_timestamp(scan_row["created_at"])
        summary = json.loads(scan_row["summary_json"]) if scan_row["summary_json"] else {}

        # 2. Fetch dependencies
        cursor.execute("SELECT * FROM dependencies WHERE scan_id = ?", (scan_id,))
        dep_rows = cursor.fetchall()
        
        inv: Dict[str, List[str]] = {
            "declared": [],
            "candidate_undeclared": [],
            "candidate_unused": [],
            "optional": [],
            "dev": []
        }
        risk_assessments: List[Dict[str, Any]] = []
        ast_usages: List[Dict[str, Any]] = []

        for row in dep_rows:
            pname = row["package_name"]
            cat = row["category"]
            if cat in inv:
                inv[cat].append(pname)
            else:
                inv["declared"].append(pname)

            if row["risk_breakdown_json"]:
                try:
                    rb = json.loads(row["risk_breakdown_json"])
                    rb["category"] = cat
                    rb["pinned_version"] = row["declared_version"]
                    risk_assessments.append(rb)
                except Exception:
                    pass

            if row["ast_usage_json"]:
                try:
                    usages = json.loads(row["ast_usage_json"])
                    ast_usages.extend(usages)
                except Exception:
                    pass

        # 3. Fetch AI recommendations
        cursor.execute("SELECT * FROM ai_recommendations WHERE scan_id = ?", (scan_id,))
        ai_rows = cursor.fetchall()
        ai_recommendations: List[Dict[str, Any]] = []
        for r in ai_rows:
            ai_recommendations.append({
                "package_name": r["package_name"],
                "candidate_replacement": r["candidate_replacement"],
                "model_name": r["model_name"],
                "proposal": json.loads(r["recommendation_json"])
            })

        # 4. Fetch verification checks
        cursor.execute("SELECT * FROM verification_runs WHERE scan_id = ?", (scan_id,))
        ver_rows = cursor.fetchall()
        verification_checks: List[Dict[str, Any]] = []
        rejected_claims: List[str] = []
        unverified_claims: List[str] = []
        unresolved_risks: List[str] = []

        for vr in ver_rows:
            chk = {
                "package_name": vr["package_name"],
                "check_name": vr["check_name"],
                "status": vr["status"],
                "evidence": vr["evidence"] or "",
                "error_details": vr["error_details"],
                "command_executed": vr["command_executed"],
                "elapsed_seconds": vr["elapsed_seconds"]
            }
            verification_checks.append(chk)
            if vr["status"] == "AI_CLAIM_REJECTED":
                rejected_claims.append(f"{vr['package_name']}: {vr['evidence']}")
            elif vr["status"] == "UNVERIFIED":
                unverified_claims.append(f"{vr['package_name']}: {vr['evidence']}")

        # 5. Fetch approval states
        cursor.execute("SELECT package_name, decision FROM approval_decisions WHERE scan_id = ?", (scan_id,))
        app_rows = cursor.fetchall()
        approval_state = {ar["package_name"]: ar["decision"] for ar in app_rows}

        # 6. Build evidence ledger
        evidence_ledger: List[CapsuleEvidenceItem] = []
        for dep in dep_rows:
            evidence_ledger.append(CapsuleEvidenceItem(
                claim=f"Dependency '{dep['package_name']}' is categorized as {dep['category']}",
                classification="observed",
                evidence=f"Discovered in repository dependency declarations/imports. Pinned: {dep['declared_version'] or 'none'}",
                timestamp=time.time()
            ))

        for chk in verification_checks:
            classification = "executed"
            if chk["status"] == "AI_CLAIM_REJECTED":
                classification = "rejected"
            elif chk["status"] == "UNVERIFIED":
                classification = "unverified"
            elif chk["status"] == "NOT_RUN":
                classification = "not_run"
            elif chk["status"] == "INCONCLUSIVE":
                classification = "inconclusive"
            elif chk["status"] == "PASS":
                classification = "verified"

            evidence_ledger.append(CapsuleEvidenceItem(
                claim=f"Verification Check: {chk['check_name']} for {chk['package_name']}",
                classification=classification,
                evidence=chk["evidence"] or chk.get("error_details") or "No details",
                timestamp=time.time()
            ))

        # Calculate confidence score heuristic
        confidence_score = 75.0
        if not verification_checks:
            confidence_score = 40.0
        elif any(c["status"] == "AI_CLAIM_REJECTED" for c in verification_checks):
            confidence_score = 25.0

        limitations = [
            "Static AST analysis does not track dynamic imports (__import__, getattr, reflection) at runtime.",
            "Temporary virtual environments isolate Python packages but are not OS-level sandboxes.",
            "Matching symbol names between libraries does not prove identical behavioral semantics.",
            "PyPI package metadata reflects public declarations; unannounced upstream breaks may still occur."
        ]

        capsule_data = ExitCapsuleData(
            schema_version="1.0.0",
            scan_id=scan_id,
            repository_path=repo_path,
            scan_timestamp=created_at,
            tool_version="1.0.0",
            dependency_inventory=inv,
            risk_assessments=risk_assessments,
            ast_usage_locations=ast_usages,
            ai_recommendations=ai_recommendations,
            verification_checks=verification_checks,
            evidence_ledger=evidence_ledger,
            rejected_ai_claims=rejected_claims,
            unverified_claims=unverified_claims,
            unresolved_risks=unresolved_risks,
            limitations=limitations,
            approval_state=approval_state,
            confidence_score=confidence_score
        )

        capsule_dir = Path(settings.CAPSULES_DIR) / scan_id
        capsule_dir.mkdir(parents=True, exist_ok=True)

        prev = cursor.execute(
            "SELECT version, sha256 FROM capsule_versions WHERE scan_id = ? ORDER BY version DESC LIMIT 1",
            (scan_id,),
        ).fetchone()
        version = (prev["version"] + 1) if prev else 1
        previous_seal = prev["sha256"] if prev else None

        capsule_data.capsule_version = version
        capsule_data.previous_seal_sha256 = previous_seal

        # The digest covers the document before the digest field is filled in.
        unsigned_payload = capsule_data.json(indent=2)
        digest = hashlib.sha256(unsigned_payload.encode("utf-8")).hexdigest()
        sealed = capsule_data.copy(update={"capsule_sha256": digest})
        payload = sealed.json(indent=2)

        version_dir = capsule_dir / f"v{version}"
        version_dir.mkdir(parents=True, exist_ok=True)
        json_path = version_dir / "capsule.json"
        md_path = version_dir / "capsule.md"

        json_path.write_text(payload, encoding="utf-8")
        md_path.write_text(generate_capsule_markdown(sealed), encoding="utf-8")

        now = iso_now()
        cursor.execute("""
            INSERT OR REPLACE INTO capsules (scan_id, capsule_json_path, capsule_md_path, created_at)
            VALUES (?, ?, ?, ?)
        """, (scan_id, str(json_path), str(md_path), now))
        cursor.execute("""
            INSERT INTO capsule_versions (scan_id, version, capsule_json_path, capsule_md_path, sha256, prev_sha256, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (scan_id, version, str(json_path), str(md_path), digest, previous_seal, now))
        conn.commit()

        return json_path, md_path, sealed
