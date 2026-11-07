# TECHNICAL DEBT & RISK REGISTER: EXIT CAPSULE GENERATOR
**Date:** 2026-11-07  
**Project:** Exit Capsule Generator (`ancient-skull`)  

---

## 1. High Priority Debt & Architectural Risks

### TD-01: Approval Gate Decoupled from Cryptographic Capsule Hash
- **Severity:** High (Security & Integrity Risk)
- **Current Behavior:** `POST /api/scans/{scan_id}/approval` accepts only `package_name`, `decision`, and `notes`. The approval is recorded without validating the exact `capsule_sha256` or `capsule_version` that the developer reviewed.
- **Risk:** If a re-scan or modification occurs between review and approval submission, an approval could theoretically attach to an altered or unreviewed state.
- **Remediation Plan:**
  - Add `capsule_sha256: str` and `capsule_version: int` to `ApprovalRequest`.
  - Validate that the submitted hash matches the active sealed capsule in `capsule_versions`.
  - Store the approved hash and version in `approval_decisions` and `approval_history`.
  - Re-seal the capsule as an approved release with an updated version hash.

### TD-02: Missing Switch Collaboration Engine Integration
- **Severity:** High (Multi-Agent Workforce Compliance)
- **Current Behavior:** Switch Console and Switch Core are running locally on ports 54291, 60398, and 60400, but the Exit Capsule backend has no bridge client connecting to it.
- **Risk:** Agent collaboration remains external to the dashboard, and automated notifications to the Slack `#action room` / `#dependency-war-room` do not fire on milestone completion.
- **Remediation Plan:**
  - Build `backend/app/switch/client.py` and `backend/app/routes/switch_route.py`.
  - Query real Switch database and gateway API to retrieve agent status, room memberships, and recent messages.
  - Automatically post scan completion, verification outcomes, and approval milestones to the Slack-bridged room.

### TD-03: Switch Agent Fleet Discrepancies
- **Severity:** Medium (Operational Consistency)
- **Current Behavior:**
  - In Switch DB, 5 specialist agents are registered: `exit-orchestrator`, `exit-analyst`, `exit-verify`, `exit-auditor`, `exit-planner`.
  - The verifier is named `exit-verify` instead of `exit-verifier`.
  - The 6th agent, `exit-architect`, is **not yet registered** in Switch.
  - The Slack bridge is connected to room `action` (`29ef14a7-...`), whereas room `exit capsule: dependencey-war-room` is connected to Telegram.
- **Remediation Plan:**
  - Report exact Switch status to developer.
  - Register `exit-architect` in Switch via Switch Core API or migration script.
  - Support both `action` and `dependency-war-room` seamlessly in the backend Switch adapter.
  - Treat `exit-verify` as the primary verification agent handle while aliasing `exit-verifier` in UI.

### TD-04: Missing UI Screens (AI Workforce & Audit Logs)
- **Severity:** Medium (Developer Experience)
- **Current Behavior:** Frontend has 9 navigation views, but lacks:
  1. **AI Workforce Page:** Visualizing active Switch agents, responsibilities, task status, and real-time collaboration.
  2. **Activity and Audit Logs Page:** Chronological audit trail of scans, verification runs, SHA256 hashes, and human approvals.
- **Remediation Plan:**
  - Add `WorkforcePage.tsx` and `AuditLogsPage.tsx`.
  - Add navigation tabs and mobile menu items to `AppShell.tsx`.
  - Connect to backend `/api/switch/*` and `/api/audit-logs` endpoints.

---

## 2. Moderate Priority Debt & Performance Opportunities

### TD-05: Ephemeral Virtualenv Creation Performance on Windows
- **Severity:** Low-to-Medium (Scan Latency)
- **Current Behavior:** `venv.create(..., with_pip=True)` executes full pip extraction inside temporary directories, taking ~5–10 seconds per package check on Windows NTFS.
- **Remediation Plan:**
  - Cache wheel downloads in a persistent `.cache/pip-wheels` directory.
  - Use `--find-links` or reusable base virtualenv templates for verification runs where appropriate, while preserving clean isolated environments for final verification runs.

### TD-06: PyPI Metadata Network Redundancy
- **Severity:** Low (Network & Rate-Limiting Risk)
- **Current Behavior:** Every scan re-fetches PyPI metadata over HTTP without a short-term local cache.
- **Remediation Plan:**
  - Introduce an SQLite or in-memory LRU cache with a 1-hour TTL for package metadata responses.

### TD-07: Speculative Patch Testing in Verification Check 8
- **Severity:** Low-to-Medium (Feature Depth)
- **Current Behavior:** Verification Check 8 (`Replacement Environment Test Execution`) is marked `NOT_RUN` with evidence *"Replacement code patch has not been applied to working copy yet. Awaiting developer approval."*
- **Remediation Plan:**
  - When the AI proposal provides concrete code modifications or import replacements, allow an isolated dry-run copy to apply the patch temporarily and run test suites in the sandbox, verifying whether tests pass with the replacement *before* presenting for developer approval.

### TD-08: Frontend Production Bundle Splitting
- **Severity:** Low (Optimization)
- **Current Behavior:** Vite outputs a single 583 kB JavaScript chunk, prompting a rollup bundle warning.
- **Remediation Plan:**
  - Add dynamic `React.lazy()` imports in `App.tsx` for heavier views (`LandingPage`, `VerificationCenterPage`, `WorkforcePage`) and configure `rollupOptions.output.manualChunks` in `vite.config.ts`.

