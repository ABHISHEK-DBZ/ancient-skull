import time
import json
from pathlib import Path
from typing import Dict, Any, List, Optional, Set
from app.metadata.pypi_client import fetch_pypi_metadata
from app.verification.isolated_env import IsolatedEnvironment
from app.verification.test_runner import detect_test_command, parse_test_results, IsolatedRepositoryCopy
from app.verification.api_compat import compare_api_usage
from app.core.security import execute_isolated_command
from app.ai.schemas import GemmaMigrationProposal

class VerificationCheckResult:
    def __init__(
        self,
        check_name: str,
        status: str,  # 'PASS', 'FAIL', 'INCONCLUSIVE', 'NOT_RUN', 'AI_CLAIM_REJECTED', 'UNVERIFIED'
        evidence: str = "",
        error_details: Optional[str] = None,
        limitations: Optional[str] = None,
        command_executed: Optional[str] = None,
        elapsed_seconds: float = 0.0
    ):
        self.check_name = check_name
        self.status = status
        self.evidence = evidence
        self.error_details = error_details
        self.limitations = limitations
        self.command_executed = command_executed
        self.elapsed_seconds = round(elapsed_seconds, 3)
        self.timestamp = time.time()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "check_name": self.check_name,
            "status": self.status,
            "evidence": self.evidence,
            "error_details": self.error_details,
            "limitations": self.limitations,
            "command_executed": self.command_executed,
            "elapsed_seconds": self.elapsed_seconds,
            "timestamp": self.timestamp
        }

class VerificationPipelineReport:
    def __init__(
        self,
        package_name: str,
        candidate_replacement: str,
        checks: List[VerificationCheckResult],
        confidence_score: float,
        confidence_factors: List[Dict[str, Any]],
        rejected_claims: List[str],
        unverified_claims: List[str],
        unresolved_risks: List[str]
    ):
        self.package_name = package_name
        self.candidate_replacement = candidate_replacement
        self.checks = checks
        self.confidence_score = round(confidence_score, 1)
        self.confidence_factors = confidence_factors
        self.rejected_claims = rejected_claims
        self.unverified_claims = unverified_claims
        self.unresolved_risks = unresolved_risks

    def to_dict(self) -> Dict[str, Any]:
        return {
            "package_name": self.package_name,
            "candidate_replacement": self.candidate_replacement,
            "confidence_score": self.confidence_score,
            "confidence_factors": self.confidence_factors,
            "checks": [c.to_dict() for c in self.checks],
            "rejected_claims": self.rejected_claims,
            "unverified_claims": self.unverified_claims,
            "unresolved_risks": self.unresolved_risks
        }

def run_verification_pipeline(
    repo_path: Path | str,
    original_package: str,
    candidate_package: str,
    ast_usages: List[Dict[str, Any]],
    ai_proposal: Optional[Dict[str, Any]] = None,
    run_live_tests: bool = True
) -> VerificationPipelineReport:
    """
    Execute the 10-point independent verification pipeline.
    Never fabricates results. Records actual commands, outputs, and statuses.
    """
    repo = Path(repo_path).resolve()
    checks: List[VerificationCheckResult] = []
    rejected_claims: List[str] = []
    unverified_claims: List[str] = []
    unresolved_risks: List[str] = []

    # 1. Confirm candidate package exists on PyPI
    t0 = time.time()
    candidate_meta = fetch_pypi_metadata(candidate_package)
    t_meta = time.time() - t0

    if candidate_meta.get("found", False):
        checks.append(VerificationCheckResult(
            check_name="1. Candidate Package Existence on PyPI",
            status="PASS",
            evidence=f"Confirmed '{candidate_package}' exists on PyPI. Latest version is {candidate_meta.get('latest_version')}.",
            limitations="Package existence does not verify API or behavioral equivalence.",
            elapsed_seconds=t_meta
        ))
    else:
        err = candidate_meta.get("error", "Package not found")
        checks.append(VerificationCheckResult(
            check_name="1. Candidate Package Existence on PyPI",
            status="FAIL",
            evidence=f"Failed to find '{candidate_package}' on PyPI.",
            error_details=err,
            limitations="Could not query package metadata.",
            elapsed_seconds=t_meta
        ))
        rejected_claims.append(f"AI claimed '{candidate_package}' is a valid PyPI package, but it was not found on PyPI.")

    # 2. Check compatible version available
    latest_version = candidate_meta.get("latest_version")
    if latest_version and not candidate_meta.get("is_yanked", False):
        checks.append(VerificationCheckResult(
            check_name="2. Compatible Release Available",
            status="PASS",
            evidence=f"Active release version {latest_version} is available and not yanked.",
            limitations="Does not guarantee backward compatibility with legacy versions."
        ))
    elif candidate_meta.get("is_yanked", False):
        checks.append(VerificationCheckResult(
            check_name="2. Compatible Release Available",
            status="FAIL",
            evidence=f"Latest release {latest_version} is marked yanked on PyPI.",
            error_details=candidate_meta.get("yanked_reason")
        ))
        rejected_claims.append(f"Candidate package version {latest_version} is yanked on PyPI.")
    else:
        checks.append(VerificationCheckResult(
            check_name="2. Compatible Release Available",
            status="INCONCLUSIVE",
            evidence="Unable to determine release version status due to missing metadata."
        ))

    # 3. Check Python version constraints
    req_py = candidate_meta.get("requires_python")
    if req_py:
        # Check against Python 3.12 (current host runtime)
        is_incompatible = any(x in req_py for x in ["<3.8", "<3.9", "<3.10", "<3.11", "<3.12", "==3.8", "==3.9"])
        if is_incompatible and not any(x in req_py for x in [">=3", ">3"]):
            checks.append(VerificationCheckResult(
                check_name="3. Python Version Constraint",
                status="FAIL",
                evidence=f"Candidate requires Python '{req_py}', which may conflict with current Python runtime.",
                error_details=f"Incompatible requires_python: {req_py}"
            ))
            rejected_claims.append(f"Candidate package '{candidate_package}' has restrictive Python constraints: {req_py}")
        else:
            checks.append(VerificationCheckResult(
                check_name="3. Python Version Constraint",
                status="PASS",
                evidence=f"Requires Python: '{req_py}', compatible with modern Python 3.12+ runtimes."
            ))
    else:
        checks.append(VerificationCheckResult(
            check_name="3. Python Version Constraint",
            status="INCONCLUSIVE",
            evidence="Candidate package has no explicit requires_python metadata on PyPI.",
            limitations="Absence of metadata requires installation verification."
        ))

    # 4. Attempt installation in separate isolated virtual environment
    exported_symbols: Set[str] = set()
    install_passed = False
    
    if candidate_meta.get("found", False) and run_live_tests:
        try:
            with IsolatedEnvironment(prefix=f"verify_{candidate_package}_") as iso_env:
                t_inst_start = time.time()
                code, stdout, stderr, elapsed = iso_env.install_package(candidate_package)
                cmd_str = f"pip install {candidate_package}"

                if code == 0:
                    install_passed = True
                    checks.append(VerificationCheckResult(
                        check_name="4. Isolated Environment Installation",
                        status="PASS",
                        evidence=f"Successfully installed '{candidate_package}' into clean isolated environment in {elapsed}s.",
                        command_executed=cmd_str,
                        elapsed_seconds=elapsed
                    ))

                    # 5. Inspect exported symbols inside isolated environment
                    py_exe = iso_env.get_python_executable()
                    inspect_script = f"""
import sys
import importlib
try:
    mod = importlib.import_module('{candidate_package.replace('-', '_')}')
    symbols = [s for s in dir(mod) if not s.startswith('_')]
    print('__EXPORTS__:' + ','.join(symbols))
except Exception as e:
    print('__ERR__:' + str(e))
"""
                    ret_code, ins_stdout, ins_stderr, ins_elapsed = iso_env.run_command(
                        [str(py_exe), "-c", inspect_script]
                    )
                    if "__EXPORTS__:" in ins_stdout:
                        raw_syms = ins_stdout.split("__EXPORTS__:")[1].strip().split(",")
                        exported_symbols = set(s.strip() for s in raw_syms if s.strip())
                        checks.append(VerificationCheckResult(
                            check_name="5. Exported Symbol Inspection",
                            status="PASS",
                            evidence=f"Successfully imported module and detected {len(exported_symbols)} exported symbols.",
                            command_executed=f"python -c 'import {candidate_package}'",
                            elapsed_seconds=ins_elapsed
                        ))
                    else:
                        checks.append(VerificationCheckResult(
                            check_name="5. Exported Symbol Inspection",
                            status="INCONCLUSIVE",
                            evidence=f"Could not directly import module '{candidate_package.replace('-', '_')}': {ins_stdout or ins_stderr}",
                            limitations="Module name might differ from package distribution name."
                        ))
                else:
                    checks.append(VerificationCheckResult(
                        check_name="4. Isolated Environment Installation",
                        status="FAIL",
                        evidence=f"Installation failed with exit code {code}.",
                        error_details=stderr or stdout,
                        command_executed=cmd_str,
                        elapsed_seconds=elapsed
                    ))
                    rejected_claims.append(f"AI claimed '{candidate_package}' can be installed cleanly, but installation failed: {stderr[:200]}")
                    checks.append(VerificationCheckResult(
                        check_name="5. Exported Symbol Inspection",
                        status="NOT_RUN",
                        evidence="Skipped because isolated installation failed."
                    ))

        except Exception as e:
            checks.append(VerificationCheckResult(
                check_name="4. Isolated Environment Installation",
                status="INCONCLUSIVE",
                evidence="Could not spawn isolated virtualenv for installation test.",
                error_details=str(e)
            ))
            checks.append(VerificationCheckResult(
                check_name="5. Exported Symbol Inspection",
                status="NOT_RUN",
                evidence="Skipped due to venv creation limitation."
            ))
    else:
        checks.append(VerificationCheckResult(
            check_name="4. Isolated Environment Installation",
            status="NOT_RUN" if not run_live_tests else "FAIL",
            evidence="Installation check not run (live execution disabled or candidate not found)."
        ))
        checks.append(VerificationCheckResult(
            check_name="5. Exported Symbol Inspection",
            status="NOT_RUN",
            evidence="Exported symbol inspection not run."
        ))

    # 6. Compare observed original API usage with candidate exported symbols
    observed_symbols: Set[str] = set()
    for usage in ast_usages:
        if usage.get("referenced_symbol"):
            observed_symbols.add(usage["referenced_symbol"])

    if exported_symbols and observed_symbols:
        api_comp = compare_api_usage(observed_symbols, exported_symbols)
        if api_comp["compatible"]:
            checks.append(VerificationCheckResult(
                check_name="6. API Usage Compatibility Check",
                status="PASS",
                evidence=f"100% of observed symbols ({', '.join(observed_symbols)}) are exported by '{candidate_package}'.",
                limitations="Presence of matching symbol names does not guarantee behavioral identity."
            ))
        else:
            checks.append(VerificationCheckResult(
                check_name="6. API Usage Compatibility Check",
                status="INCONCLUSIVE",
                evidence=f"Matched {len(api_comp['matched_symbols'])} of {len(observed_symbols)} symbols. Missing: {', '.join(api_comp['missing_symbols'])}",
                limitations="Candidate package may use different method signatures or alternative APIs."
            ))
            unverified_claims.append(f"Candidate package does not directly export symbol(s): {', '.join(api_comp['missing_symbols'])}")
    else:
        checks.append(VerificationCheckResult(
            check_name="6. API Usage Compatibility Check",
            status="INCONCLUSIVE",
            evidence="Insufficient symbol data to perform static API equivalence check."
        ))

    # 7. Baseline test execution on isolated working copy
    baseline_passed = False
    fw_name, test_cmd_args = detect_test_command(repo)
    if fw_name != "none_detected" and run_live_tests:
        try:
            with IsolatedRepositoryCopy(repo) as copy_path:
                t_b_start = time.time()
                # Run with host python
                full_cmd = ["python"] + test_cmd_args
                code, stdout, stderr, elapsed = execute_isolated_command(full_cmd, cwd=copy_path)
                test_summary = parse_test_results(stdout, stderr, code)
                
                cmd_display = " ".join(full_cmd)
                if test_summary["success"]:
                    baseline_passed = True
                    checks.append(VerificationCheckResult(
                        check_name="7. Baseline Test Suite Execution",
                        status="PASS",
                        evidence=f"Baseline tests ran successfully ({test_summary['passed_count']} passed in {elapsed}s).",
                        command_executed=cmd_display,
                        elapsed_seconds=elapsed
                    ))
                else:
                    checks.append(VerificationCheckResult(
                        check_name="7. Baseline Test Suite Execution",
                        status="FAIL",
                        evidence=f"Baseline tests failed ({test_summary['failed_count']} failed, {test_summary['error_count']} errors).",
                        error_details=stderr or stdout[:500],
                        command_executed=cmd_display,
                        elapsed_seconds=elapsed
                    ))
                    unresolved_risks.append("Baseline tests already fail prior to migration. Fix baseline tests first.")

        except Exception as e:
            checks.append(VerificationCheckResult(
                check_name="7. Baseline Test Suite Execution",
                status="INCONCLUSIVE",
                evidence="Failed to execute baseline tests in isolated copy.",
                error_details=str(e)
            ))
    else:
        checks.append(VerificationCheckResult(
            check_name="7. Baseline Test Suite Execution",
            status="NOT_RUN",
            evidence="No automated test suite detected in repository or live tests skipped."
        ))

    # 8. Replacement test execution
    # Without code patch applied yet, running tests with only replacement package verifies if original code runs without old package
    checks.append(VerificationCheckResult(
        check_name="8. Replacement Environment Test Execution",
        status="NOT_RUN",
        evidence="Replacement code patch has not been applied to working copy yet. Awaiting developer approval.",
        limitations="Cannot run replacement tests before patch is applied."
    ))

    # 9. Test Outcome Comparison
    checks.append(VerificationCheckResult(
        check_name="9. Like-for-Like Test Outcome Comparison",
        status="NOT_RUN",
        evidence="Requires completion of both baseline and replacement test executions."
    ))

    # 10. AI Claim Reconciliation
    if ai_proposal:
        # Check claims made in ai_proposal
        claimed_diff = ai_proposal.get("estimated_migration_difficulty")
        if claimed_diff == "LOW" and rejected_claims:
            checks.append(VerificationCheckResult(
                check_name="10. AI Claim Reconciliation",
                status="AI_CLAIM_REJECTED",
                evidence=f"AI claimed migration difficulty was LOW, but independent verification found critical issues: {'; '.join(rejected_claims)}"
            ))
        elif unverified_claims:
            checks.append(VerificationCheckResult(
                check_name="10. AI Claim Reconciliation",
                status="UNVERIFIED",
                evidence=f"AI proposed replacement, but {len(unverified_claims)} claims remain unverified by static checks: {'; '.join(unverified_claims)}"
            ))
        else:
            checks.append(VerificationCheckResult(
                check_name="10. AI Claim Reconciliation",
                status="PASS",
                evidence="All verified AI claims match current independent evidence."
            ))
    else:
        checks.append(VerificationCheckResult(
            check_name="10. AI Claim Reconciliation",
            status="NOT_RUN",
            evidence="No AI proposal was submitted for reconciliation."
        ))

    # Calculate transparent evidence-based confidence score (0 to 100)
    conf_factors = []
    total_conf = 0.0

    if candidate_meta.get("found", False):
        total_conf += 20.0
        conf_factors.append({"factor": "Candidate Package PyPI Existence", "score": 20.0, "status": "VERIFIED"})
    else:
        conf_factors.append({"factor": "Candidate Package PyPI Existence", "score": 0.0, "status": "FAILED"})

    if checks[1].status == "PASS":
        total_conf += 15.0
        conf_factors.append({"factor": "Active Release Available", "score": 15.0, "status": "VERIFIED"})
    else:
        conf_factors.append({"factor": "Active Release Available", "score": 0.0, "status": checks[1].status})

    if install_passed:
        total_conf += 25.0
        conf_factors.append({"factor": "Clean Isolated Installation", "score": 25.0, "status": "VERIFIED"})
    else:
        conf_factors.append({"factor": "Clean Isolated Installation", "score": 0.0, "status": "NOT_PASSED"})

    if exported_symbols and observed_symbols and len(observed_symbols.difference(exported_symbols)) == 0:
        total_conf += 20.0
        conf_factors.append({"factor": "API Symbol Overlap", "score": 20.0, "status": "VERIFIED"})
    elif exported_symbols:
        total_conf += 10.0
        conf_factors.append({"factor": "Partial API Symbol Overlap", "score": 10.0, "status": "PARTIAL"})
    else:
        conf_factors.append({"factor": "API Symbol Overlap", "score": 0.0, "status": "UNVERIFIED"})

    if baseline_passed:
        total_conf += 20.0
        conf_factors.append({"factor": "Baseline Tests Passing", "score": 20.0, "status": "VERIFIED"})
    else:
        conf_factors.append({"factor": "Baseline Tests Passing", "score": 0.0, "status": "NOT_RUN_OR_FAILED"})

    # Deduct penalty if any rejected claims
    if rejected_claims:
        total_conf = max(0.0, total_conf - 30.0)
        conf_factors.append({"factor": "Penalty for Rejected AI Claims", "score": -30.0, "status": "PENALTY"})

    return VerificationPipelineReport(
        package_name=original_package,
        candidate_replacement=candidate_package,
        checks=checks,
        confidence_score=total_conf,
        confidence_factors=conf_factors,
        rejected_claims=rejected_claims,
        unverified_claims=unverified_claims,
        unresolved_risks=unresolved_risks
    )
