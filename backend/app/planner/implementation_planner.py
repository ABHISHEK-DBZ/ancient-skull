import json
import time
from typing import Dict, Any, List, Optional
from app.planner.agent_prompt_builder import build_ai_agent_prompt

class ImplementationPlanReport:
    def __init__(
        self,
        scan_id: str,
        target_package: str,
        candidate_package: str,
        plan_dict: Dict[str, Any],
        plan_markdown: str,
        ai_agent_prompt: str
    ):
        self.scan_id = scan_id
        self.target_package = target_package
        self.candidate_package = candidate_package
        self.plan_dict = plan_dict
        self.plan_markdown = plan_markdown
        self.ai_agent_prompt = ai_agent_prompt

    def to_dict(self) -> Dict[str, Any]:
        return {
            "scan_id": self.scan_id,
            "target_package": self.target_package,
            "candidate_package": self.candidate_package,
            "plan_data": self.plan_dict,
            "plan_markdown": self.plan_markdown,
            "ai_agent_prompt": self.ai_agent_prompt
        }

def generate_implementation_plan(
    scan_id: str,
    target_package: str,
    candidate_package: str,
    ast_usages: List[Dict[str, Any]],
    ai_proposal: Optional[Dict[str, Any]] = None,
    verification_checks: Optional[List[Dict[str, Any]]] = None,
    developer_notes: Optional[str] = None
) -> ImplementationPlanReport:
    """
    Generate an evidence-backed 15-point Implementation Plan for migrating a dependency.
    """
    affected_files = sorted(list({u["file_path"] for u in ast_usages if u.get("file_path")}))
    
    # 1. Objective and scope
    objective = f"Safely migrate Python codebase from `{target_package}` to `{candidate_package}` with zero regressions."
    
    # 2. Current behavior & dependencies
    current_behavior = f"`{target_package}` is currently used across {len(affected_files)} file(s) with {len(ast_usages)} call/import site(s)."
    
    # 3. Exact files likely to change
    files_likely_to_change = affected_files
    
    # 4. Specific code locations and known API differences
    api_diffs = []
    if ai_proposal and ai_proposal.get("expected_api_differences"):
        api_diffs = ai_proposal["expected_api_differences"]
    else:
        api_diffs = [
            {"original_api": f"import {target_package}", "replacement_api": f"import {candidate_package}", "notes": "Top-level module import update"}
        ]

    # 5. Ordered implementation steps
    ordered_steps = [
        f"Create a feature branch `migrate/{target_package}-to-{candidate_package}`.",
        f"Execute baseline tests to establish pre-migration test suite health.",
        f"Update dependency declarations to install `{candidate_package}` and remove `{target_package}`.",
        f"Update imports across identified files: {', '.join(files_likely_to_change)}.",
        f"Adapt specific API call patterns according to verified API mappings.",
        f"Run isolated unit and integration test suite.",
        f"Execute post-implementation verification in the tool.",
        f"Commit clean git diff and submit pull request."
    ]

    # 6. Dependency-file changes
    dep_file_changes = f"In requirements.txt or pyproject.toml: remove `{target_package}` and add `{candidate_package}`."

    # 7. Code migration steps
    code_migration_steps = f"Refactor all import statements and call sites referencing `{target_package}` to use `{candidate_package}`."

    # 8. Tests to add or update
    tests_to_update = [
        f"Verify tests exercising functions in: {', '.join(files_likely_to_change)}",
        f"Add explicit integration test verifying `{candidate_package}` connectivity or invocation."
    ]

    # 9. Commands to execute
    commands = "pip install -r requirements.txt\npython -m pytest -v"

    # 10. Expected outcomes
    expected_outcomes = "All unit tests pass, no import errors, same input/output behavioral semantics."

    # 11. Rollback strategy
    rollback = f"Checkout base git branch and discard branch `migrate/{target_package}-to-{candidate_package}`."

    # 12. Risks and assumptions
    risks = [
        "Unobserved runtime dynamic calls could invoke unmapped methods.",
        "Candidate package may have slight differences in exception hierarchies or default timeouts."
    ]

    # 13. Verification checklist
    checklist = [
        {"item": "Branch created and working copy isolated", "completed": False, "classification": "proposed"},
        {"item": "Baseline tests verified passing", "completed": False, "classification": "evidence-backed"},
        {"item": "Dependency manifest updated", "completed": False, "classification": "proposed"},
        {"item": "Import statements refactored", "completed": False, "classification": "proposed"},
        {"item": "API calls adapted to candidate signatures", "completed": False, "classification": "proposed"},
        {"item": "Test suite executed with zero failures", "completed": False, "classification": "evidence-backed"},
        {"item": "Diff reviewed for unintended modifications", "completed": False, "classification": "proposed"}
    ]

    # 14. Definition of done
    definition_of_done = [
        f"Zero references to `{target_package}` in source tree.",
        f"`{candidate_package}` installed and locked.",
        "Full test suite passes with exit code 0.",
        "Post-implementation verification succeeds."
    ]

    # 15. Post-implementation reporting
    post_reporting = "Generate post-implementation verification report and link to capsule."

    # Build rich files_to_modify structure for UI and automated agents
    files_to_modify = []
    for f in affected_files:
        usages_in_f = [u for u in ast_usages if u.get("file_path") == f]
        lines_str = ", ".join(str(u.get("line_number")) for u in usages_in_f if u.get("line_number"))
        line_desc = f" (line {lines_str})" if lines_str else ""
        files_to_modify.append({
            "path": f,
            "reason": f"Update `{target_package}` imports and API call sites{line_desc} to `{candidate_package}`",
            "classification": "Observed AST"
        })
    if not files_to_modify:
        files_to_modify.append({
            "path": "requirements.txt",
            "reason": f"Update dependency manifest: remove `{target_package}`, declare `{candidate_package}`",
            "classification": "Manifest"
        })

    # Migration steps formatted with rich metadata
    step_details = [
        f"Create an isolated branch: git checkout -b migrate/{target_package}-to-{candidate_package}",
        f"Run baseline pytest suite to verify all existing tests pass before refactoring",
        f"Update requirements.txt or pyproject.toml to install {candidate_package} and remove {target_package}",
        f"Update import statements across affected files: {', '.join(files_likely_to_change) if files_likely_to_change else 'requirements.txt'}",
        f"Adapt specific API call patterns and argument names according to verified API differences",
        f"Run isolated unit and integration test suite to verify no functional regressions",
        f"Execute post-implementation verification checks in the Exit Capsule workbench",
        f"Inspect git diff, ensure zero unintended changes, and submit pull request"
    ]
    migration_steps = []
    for i, s in enumerate(ordered_steps):
        migration_steps.append({
            "title": s,
            "step": s,
            "details": step_details[i] if i < len(step_details) else s
        })

    plan_dict = {
        "objective": objective,
        "target_package": target_package,
        "candidate_package": candidate_package,
        "candidate_replacement": candidate_package,
        "current_behavior": current_behavior,
        "files_likely_to_change": files_likely_to_change,
        "files_to_modify": files_to_modify,
        "api_differences": api_diffs,
        "ordered_implementation_steps": ordered_steps,
        "migration_steps": migration_steps,
        "dependency_file_changes": dep_file_changes,
        "code_migration_steps": code_migration_steps,
        "tests_to_update": tests_to_update,
        "commands_to_execute": commands,
        "test_commands": ["python -m pytest tests/ -v", "pip check"],
        "expected_outcomes": expected_outcomes,
        "rollback_strategy": {
            "command": "git restore . && pip install -r requirements.txt",
            "description": rollback
        },
        "risks_and_assumptions": risks,
        "verification_checklist": checklist,
        "definition_of_done": definition_of_done,
        "acceptance_criteria": definition_of_done,
        "post_implementation_reporting": post_reporting,
        "developer_notes": developer_notes or ""
    }

    # Generate Markdown
    md_lines = [
        f"# Verified Implementation Plan: Migrate `{target_package}` &rarr; `{candidate_package}`",
        f"**Scan ID:** `{scan_id}` | **Status:** Developer Approved\n",
        f"### 1. Objective and Scope\n{objective}\n",
        f"### 2. Current State\n{current_behavior}\n",
        f"### 3. Files Likely to Change\n" + "\n".join([f"- `{f}`" for f in files_likely_to_change]) + "\n",
        f"### 4. Ordered Implementation Steps\n" + "\n".join([f"{i+1}. {s}" for i, s in enumerate(ordered_steps)]) + "\n",
        f"### 5. Dependency Manifest Changes\n{dep_file_changes}\n",
        f"### 6. Code Migration Details\n{code_migration_steps}\n",
        f"### 7. Execution Commands\n```bash\n{commands}\n```\n",
        f"### 8. Rollback Strategy\n{rollback}\n",
        f"### 9. Verification Checklist\n" + "\n".join([f"- [ ] {c['item']} (`{c['classification']}`)" for c in checklist]) + "\n",
        f"### 10. Definition of Done\n" + "\n".join([f"- [x] {d}" for d in definition_of_done]) + "\n"
    ]
    if developer_notes:
        md_lines.append(f"### Developer Notes\n> {developer_notes}\n")

    plan_md = "\n".join(md_lines)
    agent_prompt = build_ai_agent_prompt(target_package, candidate_package, plan_dict, ast_usages, f"Scan {scan_id}")

    return ImplementationPlanReport(
        scan_id=scan_id,
        target_package=target_package,
        candidate_package=candidate_package,
        plan_dict=plan_dict,
        plan_markdown=plan_md,
        ai_agent_prompt=agent_prompt
    )
