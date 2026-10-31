from datetime import datetime, timezone
from typing import Dict, Any, List
from app.capsule.schema import ExitCapsuleData

def generate_capsule_markdown(capsule: ExitCapsuleData) -> str:
    """Generate a clean, readable Markdown Dependency Exit Capsule report."""
    dt_str = datetime.fromtimestamp(capsule.scan_timestamp, timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    
    md: List[str] = []
    md.append(f"# Dependency Exit Capsule: `{capsule.scan_id}`")
    md.append(f"**Generated:** {dt_str} | **Tool Version:** {capsule.tool_version} | **Schema:** {capsule.schema_version}")
    md.append(f"**Capsule Version:** v{capsule.capsule_version} | **SHA-256:** `{capsule.capsule_sha256}`")
    if capsule.previous_seal_sha256:
        md.append(f"**Previous Seal:** `{capsule.previous_seal_sha256}`")
    md.append(f"**Repository:** `{capsule.repository_path}`\n")

    md.append("> [!NOTE]")
    md.append("> **Product Principle:** AI proposes. The tool verifies. The developer approves. Tests provide evidence.")
    md.append("> Every substantive claim in this capsule carries a verified classification.\n")

    # Executive Summary
    md.append("## 1. Executive Summary")
    inv = capsule.dependency_inventory
    declared_count = len(inv.get("declared", []))
    undeclared_count = len(inv.get("candidate_undeclared", []))
    unused_count = len(inv.get("candidate_unused", []))
    
    md.append(f"- **Declared Dependencies:** {declared_count}")
    md.append(f"- **Candidate Undeclared Imports:** {undeclared_count}")
    md.append(f"- **Candidate Unused Dependencies:** {unused_count}")
    md.append(f"- **Overall Migration Confidence:** **{capsule.confidence_score}/100** (Evidence-backed heuristic)\n")

    # Dependency Inventory Table
    md.append("## 2. Dependency Risk Assessment")
    md.append("| Dependency | Category | Version | Risk Score | Risk Level |")
    md.append("| :--- | :--- | :--- | :---: | :---: |")
    for r in capsule.risk_assessments:
        pkg = r.get("package_name")
        cat = r.get("category", "declared")
        ver = r.get("pinned_version") or "unpinned"
        score = r.get("overall_score", 0.0)
        level = r.get("level", "LOW")
        md.append(f"| **{pkg}** | `{cat}` | `{ver}` | `{score}` | **{level}** |")
    md.append("")

    # AI Recommendations & Claims
    md.append("## 3. Gemma 4 Migration Recommendations")
    if not capsule.ai_recommendations:
        md.append("_No AI recommendations generated or Gemma 4 not configured._\n")
    else:
        for rec in capsule.ai_recommendations:
            prop = rec.get("proposal", {})
            orig = prop.get("dependency", "unknown")
            cand = prop.get("candidate_replacement", "unknown")
            diff = prop.get("estimated_migration_difficulty", "UNKNOWN")
            md.append(f"### Target: `{orig}` &rarr; Candidate: `{cand}` (Difficulty: `{diff}`)")
            md.append(f"**Risk Summary:** {prop.get('risk_summary', 'N/A')}\n")
            md.append("**Reasons for Proposal:**")
            for r in prop.get("reasons", []):
                md.append(f"- {r}")
            md.append("")
            
            if prop.get("expected_api_differences"):
                md.append("**Expected API Differences:**")
                md.append("| Original API | Replacement API | Notes |")
                md.append("| :--- | :--- | :--- |")
                for api in prop.get("expected_api_differences", []):
                    md.append(f"| `{api.get('original_api')}` | `{api.get('replacement_api')}` | {api.get('notes', '')} |")
                md.append("")

    # Independent Verification Ledger
    md.append("## 4. Independent Verification Engine Results")
    md.append("| Check Name | Status | Evidence / Observation | Limitations |")
    md.append("| :--- | :---: | :--- | :--- |")
    for chk in capsule.verification_checks:
        cname = chk.get("check_name", "")
        status = chk.get("status", "NOT_RUN")
        ev = chk.get("evidence", "").replace("\n", " ")
        lim = chk.get("limitations") or "None"
        md.append(f"| **{cname}** | `{status}` | {ev} | {lim} |")
    md.append("")

    # Rejected & Unverified Claims
    if capsule.rejected_ai_claims:
        md.append("> [!WARNING]")
        md.append("> **Rejected AI Claims:** Independent verification disproved the following AI assertions:")
        for rej in capsule.rejected_ai_claims:
            md.append(f"> - {rej}")
        md.append("")

    if capsule.unverified_claims:
        md.append("> [!IMPORTANT]")
        md.append("> **Unverified AI Claims:** The following assertions lack empirical verification evidence:")
        for unv in capsule.unverified_claims:
            md.append(f"> - {unv}")
        md.append("")

    if capsule.unresolved_risks:
        md.append("> [!CAUTION]")
        md.append("> **Unresolved Risks:**")
        for risk in capsule.unresolved_risks:
            md.append(f"> - {risk}")
        md.append("")

    # AST Usages Summary
    md.append("## 5. AST Code Usage Footprint")
    md.append(f"Total observed call & reference locations: **{len(capsule.ast_usage_locations)}**\n")
    if capsule.ast_usage_locations:
        md.append("| File | Line | Enclosing Scope | Expression / Symbol |")
        md.append("| :--- | :---: | :--- | :--- |")
        for u in capsule.ast_usage_locations[:15]:
            fpath = u.get("file_path")
            line = u.get("line_number")
            scope = u.get("enclosing_scope") or "module"
            sym = u.get("referenced_symbol") or u.get("call_expression") or ""
            md.append(f"| `{fpath}` | {line} | `{scope}` | `{sym}` |")
        if len(capsule.ast_usage_locations) > 15:
            md.append(f"\n_... and {len(capsule.ast_usage_locations) - 15} more locations recorded in capsule.json._")
        md.append("")

    # Evidence Ledger
    md.append("## 6. Formal Evidence Ledger")
    md.append("| Claim / Finding | Classification | Evidence Basis |")
    md.append("| :--- | :---: | :--- |")
    for item in capsule.evidence_ledger[:15]:
        md.append(f"| {item.claim} | `{item.classification}` | {item.evidence} |")
    md.append("")

    # Limitations & Security Notes
    md.append("## 7. Limitations & Security Disclosures")
    for lim in capsule.limitations:
        md.append(f"- {lim}")
    md.append("")

    # Developer Review & Approval Status
    md.append("## 8. Developer Review Status")
    if capsule.approval_state:
        for pkg, decision in capsule.approval_state.items():
            md.append(f"- **{pkg}**: `{decision}`")
    else:
        md.append("_Pending developer review and explicit authorization._")

    return "\n".join(md)
