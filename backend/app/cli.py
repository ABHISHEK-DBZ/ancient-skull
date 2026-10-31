#!/usr/bin/env python3
"""
Exit Capsule CLI — Professional Python Dependency Resilience & Migration Audit Tool.
"""

import sys
import os
import argparse
import json
import time
import shutil
from pathlib import Path
from typing import Optional, List, Dict, Any

from app.config import settings
from app.scanner.discovery import scan_declared_dependencies
from app.scanner.ast_analyzer import analyze_repository_ast
from app.metadata.pypi_client import fetch_pypi_metadata
from app.metadata.risk_scorer import calculate_risk_score
from app.ai.gemma_client import GemmaClient
from app.verification.engine import run_verification_pipeline
from app.capsule.schema import ExitCapsuleData, CapsuleEvidenceItem
from app.capsule.markdown_builder import generate_capsule_markdown
from app.core.security import validate_safe_path, redact_secrets

VERSION = "1.0.0"

def format_color(text: str, color_code: str) -> str:
    """Format string with ANSI escape code if stdout is a TTY."""
    if sys.stdout.isatty():
        return f"\033[{color_code}m{text}\033[0m"
    return text

def bold(text: str) -> str:
    return format_color(text, "1")

def green(text: str) -> str:
    return format_color(text, "32")

def yellow(text: str) -> str:
    return format_color(text, "33")

def red(text: str) -> str:
    return format_color(text, "31")

def cyan(text: str) -> str:
    return format_color(text, "36")

def gray(text: str) -> str:
    return format_color(text, "90")

def run_analysis_pipeline(
    repo_path: Path,
    output_dir: Path,
    run_ai: bool = True,
    capsule_format: str = "all",
    fail_on_risk: bool = False,
    quiet: bool = False
) -> int:
    """Execute complete dependency scan and capsule generation directly via CLI."""
    start_time = time.time()
    
    if not quiet:
        print(bold("\n=== EXIT CAPSULE GENERATOR ==="))
        print(gray(f"Version: {VERSION} | Engine: Python AST & Deterministic Verification"))
        print(f"Target Repository : {cyan(str(repo_path.resolve()))}")
        print(f"Output Directory  : {cyan(str(output_dir.resolve()))}\n")

    # 1. Discover manifests
    if not quiet:
        print(f"[*] Step 1/5: Discovering declared dependency manifests...")
    declared_deps = scan_declared_dependencies(repo_path)
    
    # 2. AST Usage Analysis
    if not quiet:
        print(f"[*] Step 2/5: Mapping Python AST imports, bindings, and call expressions...")
    usages_by_pkg, all_observed_packages, syntax_errors = analyze_repository_ast(repo_path)

    all_pkgs = sorted(list(set(list(declared_deps.keys()) + list(usages_by_pkg.keys()))))
    if not all_pkgs:
        if not quiet:
            print(yellow("[!] No Python dependencies or import usages discovered in repository."))
        return 0

    # 3. PyPI metadata and risk scoring
    if not quiet:
        print(f"[*] Step 3/5: Collecting PyPI maintenance metadata and computing risk scores...")
    
    dep_records = []
    has_high_risk = False

    for pkg in all_pkgs:
        decl_info = declared_deps.get(pkg)
        is_declared = decl_info is not None
        is_observed = pkg in usages_by_pkg

        if is_declared and is_observed:
            category = "declared_active"
        elif is_declared and not is_observed:
            category = "candidate_unused"
        elif not is_declared and is_observed:
            category = "candidate_undeclared"
        else:
            category = "declared"

        pinned_ver = decl_info.version_spec if decl_info else None
        meta = fetch_pypi_metadata(pkg, pinned_version=pinned_ver)
        risk_report = calculate_risk_score(meta, pinned_version=pinned_ver)

        if risk_report.overall_score >= 40.0:
            has_high_risk = True

        usages = [u.to_dict() for u in usages_by_pkg.get(pkg, [])]
        dep_records.append({
            "package_name": pkg,
            "declared_version": pinned_ver,
            "category": category,
            "risk_score": risk_report.overall_score,
            "level": risk_report.level,
            "risk_breakdown": risk_report.to_dict(),
            "pypi_metadata": meta,
            "ast_usages": usages
        })

    # 4. AI Recommendations (if enabled)
    ai_recommendations = []
    if run_ai:
        if not quiet:
            print(f"[*] Step 4/5: Requesting migration plans from Gemma 4...")
        gemma = GemmaClient()
        configured, msg = gemma.is_configured()
        if configured:
            targets = [d for d in dep_records if d["risk_score"] >= 40.0]
            if not targets and dep_records:
                targets = sorted(dep_records, key=lambda x: x["risk_score"], reverse=True)[:1]
            
            for target in targets[:2]:
                pname = target["package_name"]
                try:
                    proposal = gemma.plan_migration(
                        package_name=pname,
                        pinned_version=target["declared_version"],
                        risk_summary=f"Risk Score {target['risk_score']} ({target['level']})",
                        ast_usages=target["ast_usages"]
                    )
                    ai_recommendations.append(proposal.dict())
                    if not quiet:
                        print(f"    -> Proposing replacement for {cyan(pname)}: {green(proposal.candidate_replacement)}")
                except Exception as e:
                    if not quiet:
                        print(gray(f"    -> Gemma 4 proposal for {pname} skipped: {e}"))
        else:
            if not quiet:
                print(gray(f"    -> Gemma 4 unconfigured ({msg}). Proceeding with deterministic analysis."))
    else:
        if not quiet:
            print(gray("[*] Step 4/5: AI migration recommendations disabled (--no-ai)."))

    # 5. Verification Checks
    verification_checks = []
    evidence_ledger = []
    if not quiet:
        print(f"[*] Step 5/5: Running independent verification checks & assembling capsule...")
    
    for rec in ai_recommendations:
        orig = rec["dependency"]
        cand = rec["candidate_replacement"]
        try:
            ver_results = run_verification_pipeline(
                repo_path=str(repo_path),
                original_package=orig,
                candidate_package=cand,
                ast_usages=next((d["ast_usages"] for d in dep_records if d["package_name"] == orig), []),
                run_live_tests=False
            )
            for chk in ver_results.checks:
                chk_dict = chk.to_dict()
                verification_checks.append(chk_dict)
                evidence_ledger.append(CapsuleEvidenceItem(
                    claim=f"Verification check for {orig} -> {cand}: {chk_dict['check_name']}",
                    classification="verified" if chk_dict["status"] == "PASS" else (
                        "rejected" if chk_dict["status"] in ["FAIL", "AI_CLAIM_REJECTED"] else "inconclusive"
                    ),
                    evidence=chk_dict.get("evidence") or chk_dict.get("error_details") or "No details",
                    timestamp=time.time()
                ))
        except Exception as exc:
            if not quiet:
                print(gray(f"    -> Verification for {orig} skipped: {redact_secrets(str(exc))}"))

    # Build Capsule Object
    scan_id = f"cli_{int(time.time())}"
    inv = {
        "declared": [d["package_name"] for d in dep_records if "declared" in d["category"]],
        "candidate_undeclared": [d["package_name"] for d in dep_records if d["category"] == "candidate_undeclared"],
        "candidate_unused": [d["package_name"] for d in dep_records if d["category"] == "candidate_unused"],
        "optional": [],
        "dev": []
    }
    
    # Confidence reflects what was actually executed, never a fixed claim.
    failed_checks = [c for c in verification_checks if c["status"] in ("FAIL", "AI_CLAIM_REJECTED")]
    if not verification_checks:
        confidence = 40.0
    elif failed_checks:
        confidence = 25.0
    else:
        confidence = 75.0

    capsule_data = ExitCapsuleData(
        schema_version="1.0.0",
        scan_id=scan_id,
        repository_path=str(repo_path.resolve()),
        scan_timestamp=time.time(),
        tool_version=VERSION,
        dependency_inventory=inv,
        risk_assessments=[d["risk_breakdown"] for d in dep_records],
        ast_usage_locations=[{"package": d["package_name"], "usages": d["ast_usages"]} for d in dep_records],
        ai_recommendations=ai_recommendations,
        verification_checks=verification_checks,
        evidence_ledger=evidence_ledger,
        rejected_ai_claims=[],
        unverified_claims=[],
        unresolved_risks=[d["package_name"] for d in dep_records if d["risk_score"] >= 40.0],
        limitations=["CLI scan without live container sandbox isolation"],
        approval_state={},
        confidence_score=confidence
    )

    # Write output files
    output_dir.mkdir(parents=True, exist_ok=True)
    json_path = output_dir / "capsule.json"
    md_path = output_dir / "capsule.md"

    if capsule_format in ["all", "json"]:
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(capsule_data.dict(), f, indent=2)
    
    if capsule_format in ["all", "md"]:
        md_content = generate_capsule_markdown(capsule_data)
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(md_content)

    elapsed = time.time() - start_time

    # Print summary table
    if not quiet:
        print(bold("\n" + "=" * 70))
        print(bold(f"{'PACKAGE':<22} {'PINNED':<14} {'USAGES':<8} {'RISK SCORE':<12} {'TIER':<10}"))
        print("-" * 70)
        for d in dep_records:
            score_str = f"{d['risk_score']:.1f}/100"
            level = d["level"]
            if level in ["HIGH", "CRITICAL"]:
                level_str = red(f"{level:<10}")
            elif level == "MEDIUM":
                level_str = yellow(f"{level:<10}")
            else:
                level_str = green(f"{level:<10}")
            
            pname = d["package_name"][:20]
            ver = (d["declared_version"] or "unpinned")[:12]
            usages_cnt = len(d["ast_usages"])
            print(f"{pname:<22} {ver:<14} {usages_cnt:<8} {score_str:<12} {level_str}")

        print("=" * 70)
        print(green(f"\n[OK] Analysis completed in {elapsed:.2f}s!"))
        if capsule_format in ["all", "json"]:
            print(f"    JSON Capsule     : {cyan(str(json_path.resolve()))}")
        if capsule_format in ["all", "md"]:
            print(f"    Markdown Capsule : {cyan(str(md_path.resolve()))}")
        print()

    if fail_on_risk and has_high_risk:
        if not quiet:
            print(red("[!] High risk dependencies detected (--fail-on-risk active). Exiting with code 2."))
        return 2

    return 0

def main():
    parser = argparse.ArgumentParser(
        prog="exit-capsule",
        description="Exit Capsule — AI-Powered Python Dependency Resilience & Migration Verification Tool."
    )
    parser.add_argument("-v", "--version", action="version", version=f"%(prog)s {VERSION}")

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Command: analyze
    analyze_parser = subparsers.add_parser("analyze", help="Analyze repository dependencies, map AST usages, and generate Exit Capsule.")
    analyze_parser.add_argument("path", nargs="?", default=".", help="Path to Python repository (default: current directory)")
    analyze_parser.add_argument("-o", "--output", default="./capsule-report", help="Output directory for generated capsule files (default: ./capsule-report)")
    analyze_parser.add_argument("-f", "--format", choices=["all", "json", "md"], default="all", help="Output format (default: all)")
    analyze_parser.add_argument("--no-ai", action="store_true", help="Disable Gemma 4 AI migration proposals (run 100% deterministic scan)")
    analyze_parser.add_argument("--fail-on-risk", action="store_true", help="Exit with code 2 if any HIGH or CRITICAL risk dependency is found (CI mode)")
    analyze_parser.add_argument("-q", "--quiet", action="store_true", help="Suppress terminal progress logs")

    # Command: verify
    verify_parser = subparsers.add_parser("verify", help="Run independent 10-point verification check between two packages.")
    verify_parser.add_argument("package", help="Original target package name (e.g., requests)")
    verify_parser.add_argument("--candidate", "-c", required=True, help="Candidate replacement package name (e.g., httpx)")
    verify_parser.add_argument("--repo", "-r", default=".", help="Repository context path")

    # Command: info
    subparsers.add_parser("info", help="Display system configuration, Gemma 4 status, and storage settings.")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    if args.command == "info":
        print(bold("\n=== EXIT CAPSULE CONFIGURATION ==="))
        print(f"Tool Version        : {VERSION}")
        print(f"Python Runtime      : {sys.version.split()[0]}")
        print(f"Database Path       : {settings.DATABASE_PATH}")
        print(f"Capsules Directory  : {settings.CAPSULES_DIR}")
        print(f"Gemma 4 Base URL    : {settings.GEMMA_API_BASE_URL}")
        print(f"Gemma 4 Model       : {settings.GEMMA_MODEL}")
        gemma = GemmaClient()
        configured, msg = gemma.is_configured()
        print(f"Gemma 4 Status      : {green('Configured') if configured else yellow('Unconfigured')} ({msg})")
        print()
        sys.exit(0)

    if args.command == "verify":
        print(bold(f"\n[*] Verifying migration: {cyan(args.package)} -> {green(args.candidate)}..."))
        repo_p = Path(args.repo).resolve()
        if not repo_p.exists() or not repo_p.is_dir():
            print(red(f"[!] Error: Repository path '{repo_p}' does not exist."), file=sys.stderr)
            sys.exit(1)
        usages_by_pkg, _, _ = analyze_repository_ast(repo_p)
        results = run_verification_pipeline(
            repo_path=str(repo_p),
            original_package=args.package,
            candidate_package=args.candidate,
            ast_usages=[u.to_dict() for u in usages_by_pkg.get(args.package, [])],
            run_live_tests=False,
        )
        print("-" * 65)
        for r in results.checks:
            d = r.to_dict()
            st = d["status"]
            color_st = green(st) if st == "PASS" else (red(st) if "FAIL" in st or "REJECTED" in st else yellow(st))
            print(f"[{color_st:^12}] {d['check_name']:<35} : {d.get('evidence') or d.get('error_details') or ''}")
        print("-" * 65)
        sys.exit(0)

    if args.command == "analyze":
        target_path = Path(args.path).resolve()
        if not target_path.exists() or not target_path.is_dir():
            print(red(f"[!] Error: Target path '{target_path}' is not an existing directory."), file=sys.stderr)
            sys.exit(1)

        output_path = Path(args.output).resolve()
        code = run_analysis_pipeline(
            repo_path=target_path,
            output_dir=output_path,
            run_ai=not args.no_ai,
            capsule_format=args.format,
            fail_on_risk=args.fail_on_risk,
            quiet=args.quiet
        )
        sys.exit(code)

if __name__ == "__main__":
    main()
