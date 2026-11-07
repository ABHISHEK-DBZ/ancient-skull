<div align="center">

# 🚀 Exit Capsule Generator
### Autonomous AI Dependency Migration, Cryptographic Exit Capsules & Real-Time Slack Multi-Agent Collaboration via Switch

[![Switch Multi-Agent](https://img.shields.io/badge/Switch-Multi--Agent%20Connected-3B82F6?style=for-the-badge&logo=slack&logoColor=white)](https://switch.run)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React Vite](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://vitejs.dev)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Tests Passing](https://img.shields.io/badge/Tests-49%2F49%20Passing-22C55E?style=for-the-badge&logo=pytest&logoColor=white)](https://pytest.org)

<p align="center">
  <b>One Repository. One Autonomous AI Workforce. One Cryptographically Sealed Exit Capsule.</b><br>
  <i>"Know what to replace. Prove why. Verify before you migrate."</i>
</p>

</div>

---

## 💡 What is Exit Capsule Generator?

Managing third-party dependencies in production software is risky. Packages become **abandoned, deprecated, yanked from PyPI, or introduce subtle breaking changes** in deep API call trees.

**Exit Capsule Generator** is a Developer Intelligence platform that:
1. **Analyzes Python Repositories:** Extracts declared packages and performs static AST parsing to discover exact import paths, symbol references, and call counts.
2. **Evaluates Risk:** Deterministically computes package risk scores (0–100) using PyPI release recency, version lag, and maintenance health without hallucinating vulnerabilities.
3. **Coordinates 6 AI Specialists via Switch:** Dispatches autonomous migration tasks to specialized AI agents connected via **Switch Gateway** and relayed directly to a **Slack `#action` collaboration channel**.
4. **Independently Verifies Migration Proposals:** Automatically executes dry-runs in isolated temporary sandboxes with 10-point compatibility checks.
5. **Issues Cryptographically Sealed Exit Capsules:** Generates tamper-evident `capsule.json` and `capsule.md` artifacts protected by SHA-256 seals.
6. **Enforces Human Developer Approval:** Code changes cannot be applied without explicit, version-bound developer sign-off.

---

## 🤖 How We Used Switch: The 6 Specialist AI Agents

Rather than running an ordinary monolithic LLM script or hardcoded functions, **Switch serves as the real multi-agent coordination backbone**. Six autonomous specialist roles are registered directly into the Switch Gateway with persistent UUIDs, specific system competencies, and room presence.

```
                               ┌─────────────────────────────────────────────────────────┐
                               │                    REPOSITORY SUBMITTED                 │
                               └────────────────────────────┬────────────────────────────┘
                                                            │
                                                            ▼
                                               ┌─────────────────────────┐
                                               │    exit-orchestrator    │
                                               │   Routes & Coordinates  │
                                               └────────────┬────────────┘
                                                            │
                                                            ▼
                                               ┌─────────────────────────┐
                                               │       exit-analyst      │
                                               │    AST & Risk Scoring   │
                                               └────────────┬────────────┘
                                                            │
                                                            ▼
                                               ┌─────────────────────────┐
                                               │      exit-architect     │
                                               │   Migration Alternatives│
                                               └────────────┬────────────┘
                                                            │
                                                            ▼
                                               ┌─────────────────────────┐
                                               │      exit-verifier      │
                                               │  Isolated Sandbox Tests │
                                               └────────────┬────────────┘
                                                            │
                                                            ▼
                                               ┌─────────────────────────┐
                                               │       exit-auditor      │
                                               │  Audit Ledger Integrity │
                                               └────────────┬────────────┘
                                                            │
                                                            ▼
                                               ┌─────────────────────────┐
                                               │       exit-planner      │
                                               │  15-Point Action Plan   │
                                               └────────────┬────────────┘
                                                            │
                                                            ▼
                                               ┌─────────────────────────┐
                                               │  DEVELOPER APPROVAL GATE│
                                               │  Strict SHA-256 Binding │
                                               └────────────┬────────────┘
                                                            │
                                                            ▼
                                              🔒 CRYPTOGRAPHIC EXIT CAPSULE
```

### 📋 Specialist Agent Directory

| Agent Identity | Switch UUID | Core Role & Responsibilities |
| :--- | :--- | :--- |
| **`exit-orchestrator`** | `cc70db26-fba8-4e68-9679-a6bffe723954` | **Workforce Coordinator:** Listens for repository scans, determines agent execution sequence, dispatches sub-tasks, and tracks overall progress. |
| **`exit-analyst`** | `4a1eb1d7-b8ca-43bc-937b-9fe96ce40082` | **Code & Risk Intelligence:** Parses abstract syntax trees (AST), identifies direct vs. transitive imports, maps imported symbols, and computes PyPI maintenance risk scores (0–100). |
| **`exit-architect`** | `cc843406-f1d5-49aa-a438-fbc78825e546` | **Migration Architect:** Evaluates modern drop-in package alternatives, detects API signature breaking changes, and structures migration proposals. |
| **`exit-verifier`** *(alias `exit-verify`)* | `0a831616-86f2-45e0-94cb-9c0490b40eb9` | **Verification Engineer:** Spins up isolated sandbox virtual environments, tests installation of replacements, executes baseline tests, and verifies runtime symbol equivalence. |
| **`exit-auditor`** | `766d0871-b5b8-4f63-952f-6ad18fcbb3ec` | **Governance & Cryptographic Auditor:** Inspects verification test evidence, validates SHA-256 digest chains, and checks the chronological event ledger. |
| **`exit-planner`** | `4fcf1193-95af-450d-83bb-29452a4e3c2b` | **Implementation Planner:** Generates prioritized 15-point step-by-step developer implementation plans and agent prompts once human approval is signed. |

---

## 💬 Channel & Slack Bridge Setup

The collaboration is powered by a bidirectional bridge between **Switch Gateway** and **Slack**:

```
 ┌──────────────────────┐         HTTP/REST          ┌───────────────────────────┐         Relay         ┌──────────────────────┐
 │  FastAPI Backend &   │ ─────────────────────────> │  Switch Gateway (:60398)  │ ────────────────────> │    Slack Workspace   │
 │   Dashboard Client   │ <───────────────────────── │    Local Switch Core      │ <──────────────────── │   Channel: #action   │
 └──────────────────────┘  Live Messages / Broadcast └───────────────────────────┘    Human-in-the-loop  └──────────────────────┘
```

1. **Target Collaboration Room:**  
   The primary room configured in Switch is `action` (`Room ID: 29ef14a7-572f-46d9-8d59-883d13b70f35`).
2. **Slack Bridge Relay:**  
   The `action` room is linked to the user's Slack workspace. Any milestone event triggered in the dashboard (such as scan completion, verification result, or capsule sealing) automatically broadcasts into the Slack `#action` channel.
3. **Live Channel Observability in UI:**  
   The dashboard includes a dedicated **AI Workforce Command Center** with a live Slack chat viewer powered by `GET /api/switch/rooms/{room_id}/messages` and an interactive broadcast console to communicate directly with the agents.
4. **Fail-Safe & Non-Blocking Design:**  
   Switch notifications are asynchronous and best-effort. If the gateway or network connection experiences latency, repository analysis, sandbox tests, and capsule generation continue without interruption.

---

## 🔒 Cryptographic Governance & Tamper-Evident Approval

Every migration plan produces an **Exit Capsule** with strict integrity controls:

- **Deterministic SHA-256 Hash:** The capsule payload is hashed into a 64-character digest sealing metadata, risk scores, AST evidence, and verification logs.
- **Cryptographic Approval Binding:** When a human engineer clicks **Approve**, the backend validates both `capsule_sha256` and `capsule_version`. If the capsule was altered or re-sealed after review, the server rejects approval with `HTTP 409 Conflict`.
- **Immutable Audit Trail:** All actions (scans, tests, seals, approvals) are captured in the **Governance & Audit Trail** (`GET /api/audit-logs`) with full SHA digest inspection and one-click JSON export.

---

## ⚡ Quick Start: Running the Project

### Prerequisites
- **Python 3.11+**
- **Node.js 18+** & npm
- **Switch Console** running locally (Gateway: `http://127.0.0.1:60398`)

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/ABHISHEK-DBZ/super-duper-couscous.git
cd super-duper-couscous
```

---

### Step 2: Start the Backend API (FastAPI)
```bash
# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate    # Linux / macOS

# Install backend dependencies
pip install -r backend/requirements.txt

# Run full backend regression suite (49/49 tests)
python -m pytest backend/tests -v

# Launch backend server on Port 8000
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```
*Backend will be live at `http://127.0.0.1:8000` (Interactive API docs at `http://127.0.0.1:8000/docs`).*

---

### Step 3: Start the Frontend UI (React + Vite)
```bash
cd frontend

# Install dependencies
npm install

# Run frontend tests
npm test -- --run

# Start Vite dev server on Port 5173
npm run dev
```
*Frontend will be live at `http://localhost:5173`.*

---

### Step 4: Explore the Dashboard
Navigate to `http://localhost:5173` in your browser:
- 📊 **Overview Command Center:** `http://localhost:5173?tab=overview`
- 🤖 **AI Workforce Command Center:** `http://localhost:5173?tab=workforce`
- 🛡️ **Governance & Audit Trail:** `http://localhost:5173?tab=audit-logs`
- 💊 **Exit Capsules & Seal Verifier:** `http://localhost:5173?tab=capsules`
- 🔍 **New Repository Analysis:** `http://localhost:5173?tab=new-scan`

---

## 💻 CLI Usage (Headless Automated Scanning)

You can analyze any Python repository without launching the UI:

```bash
# Headless AST analysis, PyPI risk scoring, and capsule creation
python -c "import sys; sys.path.insert(0, 'backend'); from app.cli import main; sys.argv = ['cli', 'analyze', 'path/to/python_repo', '--no-ai']; main()"
```

Outputs generated:
- `capsule-report/capsule.json`: Cryptographically verifiable machine-readable capsule.
- `capsule-report/capsule.md`: Developer-friendly markdown documentation and migration summary.

---

## 🛡️ Security & Privacy

- **Zero Secrets Hardcoded:** No API keys, OAuth secrets, or credentials exist in the codebase.
- **Isolated Execution:** Verification tests run strictly in temporary sandboxes without touching production host environments.
- **Deterministic PyPI Risk Data:** Package maintenance condition, version lag, and yanked states are fetched directly from PyPI; never fabricated.

---

<div align="center">
  <sub>Built with ❤️ by <b>Abhishek & Team</b> for the <b>Switch Hackathon</b>.</sub><br>
  <sub>Powered by <b>Switch Console Multi-Agent Collaboration Protocol</b>.</sub>
</div>
