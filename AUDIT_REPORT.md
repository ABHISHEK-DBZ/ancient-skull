# AUDIT REPORT: EXIT CAPSULE GENERATOR
**Date:** 2026-11-07
**Scope:** Current working tree (`main` + uncommitted changes implementing roadmap Phases 1-3)
**Auditor:** Buffy (AI coding agent)
**Method:** Static review of all changed/new files, targeted runtime probes, full backend and frontend test suites.

---

## 1. Executive Summary

The uncommitted work delivers real functionality, not scaffolding: the approval gate is now bound to a capsule SHA-256 and version, the capsule hash/chain can be independently re-verified, live Switch workforce data is exposed through a real gateway client, and the two missing UI pages exist. The test suites pass (49 backend, 8 frontend, `tsc` clean) and the live Switch gateway is reachable and populated.

However, three issues should block a merge:

1. **Authentication is bypassed for the two new API surface areas.** `/api/switch/*` and `/api/audit-logs` were added to `PUBLIC_API_PREFIXES`, so under `REQUIRE_AUTH=true` they are reachable without a session. Verified: anonymous `POST /api/switch/notify` returned `200` and posted to the connected Slack room, and no origin/CSRF check applies to those paths.
2. **The Switch event dispatcher is broken and its test hides the defect.** `SwitchEventDispatcher` calls `client.post_message(body)` while the client signature is `post_message(room_id, body)`; every dispatcher method raises `TypeError`. The test overrides `post_message` with a different signature, so it passes anyway.
3. **The Switch integration tests are not hermetic.** They call the live local Switch gateway and assert on real registration data. Verified: forcing an unreachable gateway fails `test_switch_api_routes` with `assert 0 >= 5`. CI without a local Switch will fail.

A further structural concern is that the test suite runs against the real `backend/exit_capsule.db`; 12 scan rows from `test_e2e_scan_flow.py` have accumulated there with no teardown.

No source code was modified during this audit.

---

## 2. Verification Baseline

| Check | Command | Result |
|---|---|---|
| Backend tests | `cd backend && python -m pytest -q` | **49 passed**, 1 warning (29 s) |
| Frontend tests | `cd frontend && npx vitest run` | **8 passed** (1 file) |
| TypeScript | `cd frontend && npx tsc --noEmit` | **0 errors** |
| Switch gateway reachable | `/api/switch/status` via TestClient | `available: true`, 6 canonical roles, live room data |
| Auth bypass probe | `REQUIRE_AUTH=true`, no session | `/api/switch/*` and `/api/audit-logs` return **200** |
| Dispatcher probe | `SwitchEventDispatcher.notify_scan_started(...)` | **TypeError: missing 1 required positional argument: 'body'** |
| Hermeticity probe | `SWITCH_GATEWAY_URL=http://127.0.0.1:59999 pytest tests/test_switch_integration.py` | **1 failed**, `assert 0 >= 5` |
| Real DB footprint | `select count(*) from scans` | **12 rows**, all from e2e test runs |

---

## 3. Findings

### HIGH-01 — New endpoints bypass `REQUIRE_AUTH` and CSRF protection
**Files:** `backend/app/main.py:24-31`

`/api/switch` and `/api/audit-logs` were added to `PUBLIC_API_PREFIXES`. The middleware's origin check is inside the `if not any(path.startswith(p) ...)` branch, so these paths get neither session enforcement nor cross-origin rejection.

Consequences with `REQUIRE_AUTH=true` (the documented public-deployment setting):
- `GET /api/switch/status` leaks agent registry, room names, bridge types, Slack/Telegram channel links, and raw exception strings.
- `POST /api/switch/notify` lets any unauthenticated caller (or any third-party site via a cross-origin form/fetch) post arbitrary content into the user's Slack room, authenticated as the Switch gateway admin (see HIGH-03).
- `GET /api/audit-logs` exposes the full timeline of every scan whose `owner_id` is `NULL` to anonymous callers, while `/api/scans/*` correctly returns 404 for those same rows.

Verified probe (session cookie absent, `REQUIRE_AUTH=True`):

```
GET  /api/switch/status     -> 200
GET  /api/switch/workforce  -> 200
POST /api/switch/notify     -> 200   (message delivered to the live Slack room)
GET  /api/audit-logs        -> 200
GET  /api/settings          -> 401   (control)
```

**Remediation:** remove both prefixes from `PUBLIC_API_PREFIXES`; add `require_session(request)` (or a per-scan `enforce_scan_access`) to every switch and audit-log handler. Keep `/api/health` public.

**Note:** the audit itself triggered one real side effect — the probe's `POST /api/switch/notify` delivered a `"probe"` message to the connected Switch/Slack room. That is exactly the exposure this finding describes.

### HIGH-02 — `SwitchEventDispatcher` cannot post and its test masks it
**Files:** `backend/app/switch/dispatcher.py:41,54,65,88,100,121,132`; `backend/tests/test_switch_integration.py:84-90`

All seven notifier methods call `self.client.post_message(body)`, but `SwitchClient.post_message(self, room_id, body)` requires two arguments. Every call raises `TypeError` before any coroutine is created. The methods are currently unused by routes (routes use `notify_milestone`), so the product works, but this is broken dead code that the roadmap points to for richer milestone messages.

The covering test defines `async def post_message(self, body, room_id=None, mention_agent_id=None)`, i.e. it redefines the method with a different signature and cannot catch the arity mismatch.

**Remediation:** pick one contract. Either delete `dispatcher.py` in favour of `notify_milestone` + a small event-message builder, or make the dispatcher resolve a room with `pick_notification_room` and call `post_message(room_id, body)`. Then change the test to use the real signature.

### HIGH-03 — Implicit admin authentication from the host filesystem
**Files:** `backend/app/switch/client.py:14-33,199-208`

`SwitchClient` reads `%APPDATA%\switchdash\local-switch-server\native\run\switch-core.env` and, when explicit settings are empty, uses `GATEWAY_ADMIN_EMAIL` / `GATEWAY_ADMIN_PASSWORD` from it to log in to the gateway as admin. This is a Windows-only discovery path embedded in the server, and it means a request handler can act with console-level Switch privileges on behalf of whoever calls the endpoint. Combined with HIGH-01, any anonymous caller drives an admin session.

**Remediation:** make auto-discovery opt-in via an explicit setting (e.g. `SWITCH_DISCOVER_LOCAL=true`), default it off for deployments where `REQUIRE_AUTH` is on, and fail closed rather than reading credentials implicitly.

### HIGH-04 — Switch tests depend on a live local gateway; no CI isolation
**Files:** `backend/tests/test_switch_integration.py:44-76`

`test_switch_workforce_retrieval` and `test_switch_api_routes` connect to the real gateway and assert `total >= 5` and successful agent/room responses. The fallback in `test_switch_workforce_retrieval` catches exceptions, but `test_switch_api_routes` has no fallback and fails hard when Switch is unavailable (verified above). `test_switch_config` asserts `cfg.admin_password == os.getenv(...)`, which is tautological rather than a real check.

**Remediation:** replace both live tests with the `_FakeClient` pattern already used in `test_switch_client.py` (monkeypatched `SwitchClient`), and keep the live check as a manual smoke test or an opt-in marker (`@pytest.mark.live`).

### MEDIUM-01 — Blocking synchronous Switch I/O in request paths
**Files:** `backend/app/routes/approval.py:92`, `verification.py:87`, `planner.py:81`, `scan.py:157`; `backend/app/switch/client.py:325-338`

`notify_milestone` opens a new client, logs in, lists rooms, and posts — three sequential HTTP calls with a 10 s per-call timeout — synchronously inside the request handler (approval / verification / plan) and inside the scan background task. A slow or hung gateway can add up to ~30 s to those responses. Cookies are cached per client instance only, so every milestone re-authenticates. Timeouts are hardcoded and not configurable.

**Remediation:** move milestone emission off the request path (background thread/queue or FastAPI `BackgroundTasks`), cache the session cookie for the process, and lower/configure the notify timeout.

### MEDIUM-02 — Tests run against the production SQLite file
**Files:** `backend/tests/*`, `backend/app/config.py:76`

`DATABASE_PATH` resolves to `backend/exit_capsule.db`, and no fixture overrides it. `test_approval_binding.py` seeds and cleans its own rows, but `test_e2e_scan_flow.py` creates a scan, capsule versions, plans, approvals and post-verification rows and never removes them — the DB now holds 12 scans from repeated test runs. Tests also touch `generated_capsules/` and `temp_workspaces/`.

**Remediation:** add an autouse session fixture in `conftest.py` that points `settings.DATABASE_PATH`, `CAPSULES_DIR`, and `TEMP_WORKSPACES_DIR` at a `tmp_path`, initialises the schema, and drops it afterwards.

### MEDIUM-03 — `GET /api/switch/status` fans out per room and leaks internal errors
**File:** `backend/app/routes/switch_route.py:23-55`

For every room the handler issues a separate `room_detail` request (N+1 remote calls per page load), each discarding failures silently, and returns `str(exc)` verbatim to the caller on failure. A refresh of the Workforce page with many rooms can take seconds and exposes gateway internals.

**Remediation:** add a short-lived cache for the status payload, or fetch room detail lazily from the UI; return a generic error to the client and log the detail server-side.

### MEDIUM-04 — Approval binding proves staleness, not review
**Files:** `frontend/src/pages/DependencyDetailsPage.tsx` (`submitApproval`), `backend/app/routes/approval.py:24-100`

The server-side binding is correct and well tested: wrong hash and wrong version both return 409, malformed digest returns 400, the accepted hash/version is recorded, and a new seal is chained to the reviewed one. Two residual gaps remain:

- The UI fetches the capsule immediately before posting (`getCapsule` → `recordApproval`), so the payload always carries the *current* hash. It prevents approving a stale capsule but cannot attest that a human saw that version's contents.
- If no capsule exists, `POST /approval` seals one itself and then approves it, so an approval can implicitly create the artifact it is approving. `GET /capsule` already auto-seals, which hides this in the happy path but leaves an inconsistent rule.

**Remediation:** surface the version/hash in the approval modal (the roadmap's "SHA256 badge"), and return 409/"seal the capsule first" instead of auto-sealing inside the approval route.

### MEDIUM-05 — Frontend API contract does not match the switch payload
**Files:** `frontend/src/api/types.ts:229-256`, `frontend/src/api/client.ts:78-86`, `backend/app/routes/switch_route.py:63-80`

`SwitchStatus` declares required `gateway_url` and `agents` fields that the backend never returns. `notifySwitchRoom` is typed as returning `{ ok, room_id, room_name, bridge_type }`, but the endpoint returns `{ status, room_id, room_name }`; `WorkforcePage` therefore always renders `Posted to … (internal)` because `bridge_type` is `undefined`. TypeScript cannot catch this because the response is cast through a generic `request()`.

**Remediation:** align the interfaces with the actual payload (or add the fields server-side). `SwitchRoom` is otherwise accurate for the merged detail payload, which does include `agent_count`, `description`, `external_channel_url`, `agent_statuses`.

### MEDIUM-06 — "Audit logs" are derived, not append-only
**File:** `backend/app/routes/audit_logs.py`

The page labels the stream "append-only", but it is assembled at read time from `scans`, `ai_recommendations`, `verification_runs`, `capsule_versions` and `approval_history`. `approval_decisions` is upserted, capsule files are rewritten in place, and neither `scans` nor `verification_runs` is immutable. Filtering, sorting and limiting happen in Python after reading every row from five tables, so cost grows linearly with history and `limit` does not reduce the read.

**Remediation:** either describe it as a "derived timeline", or introduce a real append-only `audit_events` table written by the workflow, with `(created_at)` indexed and pagination pushed into SQL.

### LOW-01 — Scans with `owner_id IS NULL` are visible to anonymous callers in audit logs
**File:** `backend/app/routes/audit_logs.py:22-31`

`_visible_scans` includes every row with a null owner unconditionally, whereas `enforce_scan_access` treats those scans as 404 when `REQUIRE_AUTH` is on. Once HIGH-01 is fixed this is only a consistency bug, but the rule should be shared rather than reimplemented.

### LOW-02 — Inconsistent behaviour before the first seal
**File:** `backend/app/routes/capsule.py:92-101`

`GET /capsule` auto-seals on demand, while `POST /capsule/verify-hash` returns 404 for the same scan. The Capsule page always renders the "Verify seal chain" button, so a first-time user can get a 404 from the button beside a displayed capsule.

### LOW-03 — Deprecated event-loop handling in the dispatcher
**File:** `backend/app/switch/dispatcher.py:19`

`asyncio.get_event_loop()` emits a `DeprecationWarning` (seen in the test run) and is wrong for a synchronous `httpx.Client`; the "fire and forget" wrapper cannot work with sync results at all. Removing the dispatcher (HIGH-02) resolves this.

### LOW-04 — Config duplication and deployment-specific constants
**Files:** `backend/app/switch/config.py`, `backend/app/models/schemas.py:36-38`

`SwitchConfig` duplicates gateway/room settings that also live in `Settings`, hardcodes room UUIDs and a DB password env var, and is only referenced by tests, so the two configs will drift. Separately, `SwitchNotifyRequest` was added to `schemas.py` but is unused — `switch_route.py` defines its own `NotifyRequest`.

### LOW-05 — Untracked scratch artifacts in the working tree
`capsule-report/`, `scratch_cf.py`, `frontend/qa_tmp.mjs`, and this (previously empty) `AUDIT_REPORT.md` are untracked. Decide whether each belongs in the repo; add ignore rules or delete them.

### LOW-06 — Audit documents are now stale
`ARCHITECTURE_AUDIT.md`, `TECHNICAL_DEBT.md`, and `IMPLEMENTATION_STATUS.md` still describe 29 backend tests / 6 frontend tests, "Switch bridge not implemented", and "Workforce/Audit pages missing". Reality is 49/8, a working bridge, and both pages present. TD-01, TD-02 and TD-04 are substantially delivered; leaving them marked open misrepresents the state.

---

## 4. What Is Solid

- **Approval binding is real and tested.** `test_approval_binding.py` covers stale hash (409), stale version (409), malformed digest (400), persisted hash/version, re-sealed version chaining, and successful hash verification. Schema migration is additive (`_add_column`), so existing databases upgrade safely.
- **Hash verification is genuinely independent.** The digest is computed over the document with `capsule_sha256` blanked, and `verify-hash` recomputes it from the file on disk and walks `prev_sha256` per version. The tamper test (mutating `confidence_score`) is detected.
- **Switch client is defensive.** Best-effort notifications never break the workflow (`notify_milestone` swallows exceptions), the status endpoint degrades to `available: false`, and role aliasing (`exit-verify` → `exit-verifier`) is handled in one place.
- **The workforce view uses live data.** Verified against the running gateway: roles, live status, connectors, room memberships and bridges are real, and the missing `exit-architect` is reported as `registered: false` rather than fabricated.
- **No regressions in the existing pipeline.** All 49 backend tests, including the end-to-end scan → verify → approval → plan → capsule → post-verify flow, pass.

---

## 5. Recommended Order of Work

1. **HIGH-01** — remove the public prefixes and require a session on all new endpoints (small, security-critical).
2. **HIGH-02 / LOW-03** — fix or delete the dispatcher and make its test use the real signature.
3. **HIGH-04 / MEDIUM-02** — make the test suite hermetic (temp DB + mocked Switch) so CI is meaningful.
4. **MEDIUM-01 / MEDIUM-03** — move notifications off the request path and stop fan-out/leakage in the status endpoint.
5. **MEDIUM-04 / MEDIUM-05 / MEDIUM-06** — tighten the approval UX, align the client types, and either label the log honestly or add a real event table.
6. **HIGH-03, LOW-01/02/04/05/06** — hardening, consistency, and documentation refresh.

---

## 6. Limitations of This Audit

- The live Switch gateway behaviour was observed through the application's own endpoints; the gateway's API contract was not reviewed directly.
- No browser-level walkthrough of the new pages was performed. UI conclusions are based on source review, TypeScript checking, component tests, and live API payloads.
- Gemini/Gemma inference paths were not exercised (no remote key configured in this environment); AI proposal generation was reviewed as code only.
- No load or concurrency testing was performed, so the impact of blocking notifications under real traffic is estimated, not measured.
