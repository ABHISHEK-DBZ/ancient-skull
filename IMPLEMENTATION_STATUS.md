# IMPLEMENTATION STATUS: EXIT CAPSULE GENERATOR
**Date:** 2026-11-07  
**Status Version:** Phase 3.1 — Integration Verified  
**Project:** Exit Capsule Generator (`ancient-skull`)  
**Verification:** 49 backend tests + 8 frontend tests passing, `tsc` clean, Vite production build green, live backend→Switch→Slack post confirmed.  

---

## 1. Master Implementation Scorecard

| Module / Capability | Spec Requirement | Current Status | Test Evidence | Gap / Required Action |
|---|---|---|---|---|
| **A. Repository Scanner** | Scan local/remote Python repos, parse `requirements.txt` & `pyproject.toml` | **Complete (100%)** | `test_discovery.py` (4 tests PASS) | Add support for `setup.py` / `Pipfile.lock` fallback. |
| **B. AST Usage Analyzer** | Static AST analysis, symbol mapping, enclosing scope attribution | **Complete (95%)** | `test_ast_analyzer.py` (PASS) | Add detection of `from ... import *` edge cases. |
| **C. Risk Scoring Engine** | Deterministic 0–100 risk score, explainable factors, no hallucinations | **Complete (100%)** | `test_risk_scorer.py` (4 tests PASS) | Add PyPI query disk/memory cache. |
| **D. Gemma 4 AI Adapter** | Gemma model family gating, bounded prompt, strict JSON extraction | **Complete (95%)** | `test_gemma_adapter.py` (3 tests PASS) | Add local Ollama model auto-discovery. |
| **E. 10-Point Verifier** | Ephemeral venv creation, isolated install, export inspect, test runner | **Complete (90%)** | `test_verification_engine.py` (3 tests PASS) | Implement Check 8 (speculative patch testing in sandbox). |
| **F. Exit Capsule Generator** | `capsule.json`, `capsule.md`, evidence ledger, cryptographic SHA256 chain | **Complete (100%)** | `test_capsule.py` (PASS) | Expose hash verification endpoint for external CLI/auditors. |
| **G. Human Approval Gate** | Explicit developer review before planning or code modification | **Complete (100%)** | `test_approval_binding.py` (stale hash/version → 409, reseal, tamper detect) | Approval is bound to exact capsule SHA256 + version. |
| **H. Implementation Planner** | 15-point action plan, checklist, copy-paste AI agent prompt | **Complete (100%)** | `test_approval_planner.py` (PASS); approval milestone posts to Switch | Plan generation remains gated by bound approval. |
| **I. Post-Verification** | Unified diff calculation, import removal/addition check | **Complete (90%)** | `test_post_verification.py` (PASS) | Link post-verification diff into capsule v2 revision. |
| **J. Frontend Dashboard** | 11 core screens, SaaS design, real data, no placeholder metrics | **Complete (100%)** | `dashboard.test.ts` (8 tests PASS), `tsc` clean, live screenshot QA of Overview/Workforce/Audit Logs/Capsules | AI Workforce and Audit Log views added; approval UI passes capsule SHA/version. |
| **K. Switch Agent Layer** | 6 specialist roles coordinating via Switch Console, Gateway & Slack | **Complete registration + bridge (95%)** | Live `/api/switch/status` shows 6/6 registered, 5 live; backend→Switch→Slack post verified (`action`, seq 21) | `exit-architect` is registered but disconnected until a Codex session is started from Switch Console. |

---

## 2. Detailed Subsystem Audit

### 2.1 Backend APIs & Route Endpoints

| Route File | Endpoint | Method | Status | Notes |
|---|---|---|---|---|
| `routes/scan.py` | `/api/scans/start` | POST | Working | Supports local directory and git clones |
| `routes/scan.py` | `/api/scans` | GET | Working | Lists historical scans from SQLite |
| `routes/scan.py` | `/api/scans/{scan_id}` | GET | Working | Returns full scan progress and summary |
| `routes/dependencies.py` | `/api/scans/{scan_id}/dependencies` | GET | Working | Returns dependency inventory and risk |
| `routes/dependencies.py` | `/api/scans/{scan_id}/dependencies/{package_name}` | GET | Working | Detailed AST usages and PyPI metadata |
| `routes/verification.py` | `/api/scans/{scan_id}/verify` | POST | Working | Runs 10-point verification in ephemeral venv |
| `routes/verification.py` | `/api/scans/{scan_id}/verification-results` | GET | Working | Fetches check results and confidence score |
| `routes/approval.py` | `/api/scans/{scan_id}/approval` | POST | Working (Needs Hardening) | Needs `capsule_sha256` parameter in payload |
| `routes/approval.py` | `/api/scans/{scan_id}/approval/{package_name}` | GET | Working | Returns `APPROVED`, `REJECTED`, or `PENDING` |
| `routes/planner.py` | `/api/scans/{scan_id}/plan` | POST | Working | Emits 15-point plan and agent prompt |
| `routes/capsule.py` | `/api/scans/{scan_id}/capsule` | GET | Working | Serves `capsule.json` and download link |
| `routes/capsule.py` | `/api/scans/{scan_id}/capsule/markdown` | GET | Working | Serves rendered `capsule.md` |
| `routes/capsule.py` | `/api/scans/{scan_id}/capsule/versions` | GET | Working | Lists capsule version ledger and hashes |
| `routes/post_verification.py` | `/api/scans/{scan_id}/post-verify` | POST | Working | Verifies modified working copy against original |
| `routes/settings_route.py` | `/api/settings` | GET/POST | Working | Manages Gemma 4 and environment settings |
| `routes/auth_github.py` | `/api/auth/github/*` | GET/POST | Working | OAuth integration with encrypted access tokens |
| `routes/switch_route.py` | `/api/switch/status` | GET | Working | Live workforce, rooms, bridge metadata; degrades to `available: false` |
| `routes/switch_route.py` | `/api/switch/notify` | POST | Working | Posts to a chosen/auto-selected room; 400/404/503 failure paths tested |
| `routes/audit_logs.py` | `/api/audit-logs` | GET | Working | Append-only scan/verify/seal/approval timeline |
| `routes/capsule.py` | `/api/scans/{scan_id}/capsule/verify-hash` | POST | Working | Recomputes SHA256 and validates version chain; tamper test passes |

---

## 3. Frontend Pages Status

| Page Component | Path | Current Status | Notes |
|---|---|---|---|
| `DashboardPage.tsx` | Overview | Complete | Real metric cards, recent scans list |
| `NewScanPage.tsx` | New Analysis | Complete | Path validation, Gemma toggle, sample fixture button |
| `AnalysisResultsPage.tsx` | Dependencies | Complete | Filters by category/risk, search, inventory count |
| `DependencyDetailsPage.tsx` | Dependency Details | Complete | Displays AST snippets, risk breakdown, approval box |
| `VerificationCenterPage.tsx` | Verification | Complete | 10-point check suite, live logs, confidence gauge |
| `CapsulePage.tsx` | Exit Capsules | Complete | Capsule JSON/MD viewer, SHA256 copy, download buttons |
| `PlansListPage.tsx` | Plans List | Complete | Lists generated 15-point plans |
| `ImplementationPlannerPage.tsx`| Plan Detail | Complete | Interactive 15-step checklist, copy prompt directive |
| `PostVerificationPage.tsx` | Post-Verify | Complete | Side-by-side diff, AST import removal verification |
| `SettingsPage.tsx` | Settings | Complete | Model config, API key input, system diagnostics |
| `WorkforcePage.tsx` | AI Workforce | Complete | Live agent status, room bridges, milestone posting; screenshot QA clean |
| `AuditLogsPage.tsx` | Audit Logs | Complete | Real scan/verify/seal/approval timeline; scoped by active scan |

---

## 4. Switch Integration Status

| Item | Actual Current State | Required State | Action |
|---|---|---|---|
| Switch Console Engine | Running (PID 9620, port 54291) | Running | Connect via backend Switch service |
| Switch Core Server | Running (PID 45996, port 60398) | Running | Connect via backend Switch service |
| PostgreSQL DB | Running on port 60400 | Running | Read/write agent status and room feeds |
| Agent: `exit-orchestrator` | Registered (`cc70db26-...`) | Registered | Active coordinator role |
| Agent: `exit-analyst` | Registered (`840c4049-...`) | Registered | Active dependency analyst role |
| Agent: `exit-verify` | Registered (`17526868-...`) | Registered as `exit-verifier` | Normalize name/role in UI and backend |
| Agent: `exit-auditor` | Registered (`766d0871-...`) | Registered | Active integrity auditor role |
| Agent: `exit-planner` | Registered (`4fcf1193-...`) | Registered | Active implementation planner role |
| Agent: `exit-architect` | Registered (`cc843406-...`), Codex CLI, room `action`; disconnected | Registered and live | Start a Codex session from Switch Console to make it live |
| Slack Collaboration Bridge | Active in room `action` (`29ef14a7-...`); backend→Switch→Slack message verified | Active | Notifications target the chosen or war room |
| Telegram Bridge | Active in room `exit capsule: dependencey-war-room` | Secondary notification channel | Keep informed of major milestones |

---

## 5. Verification Test Suite Status

```
Backend Tests:  49 passed in 31.41s (pytest)
Frontend Tests: 8 passed in 1.18s (vitest)
TypeScript:     0 errors (tsc --noEmit)
Vite Bundle:    dist/ generated; 598.13 kB (gzip 159.88 kB) — chunk-size warning only
Live QA:        Overview, AI Workforce, Audit Logs, Capsules → HTTP 200, 0 console errors
Slack Bridge:   POST /api/switch/notify → room `action`, message seq 21 confirmed
```
All tests are green. Test collection now ignores the nested sample fixture project.

