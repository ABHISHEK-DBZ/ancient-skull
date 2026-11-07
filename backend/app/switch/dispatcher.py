import asyncio
import logging
from typing import Any, Dict, Optional

from app.switch.client import SwitchClient

logger = logging.getLogger(__name__)


class SwitchEventDispatcher:
    """Dispatches core workflow lifecycle milestones to Switch and connected Slack rooms."""

    def __init__(self, client: Optional[SwitchClient] = None):
        self.client = client or SwitchClient()

    def _fire_and_forget(self, coroutine):
        """Run coroutine in background without blocking the caller."""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(coroutine)
            else:
                asyncio.run(coroutine)
        except RuntimeError:
            try:
                new_loop = asyncio.new_event_loop()
                new_loop.run_until_complete(coroutine)
                new_loop.close()
            except Exception as e:
                logger.warning("Could not dispatch Switch event: %s", e)

    def notify_scan_started(self, scan_id: str, repo_path: str):
        """Announce that a repository analysis has started."""
        body = (
            f"🚀 *[exit-orchestrator]* Dependency Scan Initiated\n"
            f"• *Scan ID:* `{scan_id}`\n"
            f"• *Repository:* `{repo_path}`\n"
            f"• *Active Coordinator:* `@exit-orchestrator`\n"
            f"• *Status:* Parsing manifests and analyzing AST import graphs..."
        )
        self._fire_and_forget(self.client.post_message(body))

    def notify_scan_completed(self, scan_id: str, declared_count: int, high_risk_count: int, critical_risk_count: int):
        """Announce scan completion and risk findings."""
        risk_emoji = "🔴" if critical_risk_count > 0 else ("🟡" if high_risk_count > 0 else "🟢")
        body = (
            f"{risk_emoji} *[exit-analyst]* Repository Intelligence & Risk Analysis Complete\n"
            f"• *Scan ID:* `{scan_id}`\n"
            f"• *Dependencies Discovered:* {declared_count}\n"
            f"• *High Risk Dependencies:* {high_risk_count}\n"
            f"• *Critical Risk Dependencies:* {critical_risk_count}\n"
            f"• *Analyst Recommendation:* Review AST usages and initiate independent verification."
        )
        self._fire_and_forget(self.client.post_message(body))

    def notify_proposal_generated(self, scan_id: str, package_name: str, candidate_package: str, reason: str):
        """Announce an AI or deterministic migration proposal."""
        body = (
            f"💡 *[exit-architect]* Migration Strategy Formulated\n"
            f"• *Scan ID:* `{scan_id}`\n"
            f"• *Target Package:* `{package_name}` ➔ *Candidate:* `{candidate_package}`\n"
            f"• *Reason:* {reason}\n"
            f"• *Next Step:* Dispatching to `@exit-verify` for 10-point independent verification."
        )
        self._fire_and_forget(self.client.post_message(body))

    def notify_verification_completed(
        self,
        scan_id: str,
        package_name: str,
        candidate_package: str,
        passed_checks: int,
        total_checks: int,
        confidence_score: float,
        has_rejected_claims: bool,
    ):
        """Announce 10-point independent verification results."""
        ver_emoji = "⚠️" if has_rejected_claims else ("✅" if passed_checks >= 6 else "ℹ️")
        body = (
            f"{ver_emoji} *[exit-verifier]* Independent Sandbox Verification Finished\n"
            f"• *Package:* `{package_name}` ➔ *Candidate:* `{candidate_package}`\n"
            f"• *Passed Checks:* {passed_checks}/{total_checks}\n"
            f"• *Evidence Confidence Score:* {confidence_score}%\n"
            f"• *Isolated Virtualenv:* Verified clean installation & symbol exports\n"
            f"• *AI Claims:* {'Certain AI claims were REJECTED by empirical test' if has_rejected_claims else 'All empirical checks consistent'}\n"
            f"• *Next Step:* Capsule ready for cryptographic audit by `@exit-auditor`."
        )
        self._fire_and_forget(self.client.post_message(body))

    def notify_capsule_sealed(self, scan_id: str, version: int, sha256_hash: str):
        """Announce cryptographic sealing of a Dependency Exit Capsule."""
        body = (
            f"🔒 *[exit-auditor]* Dependency Exit Capsule Sealed (v{version})\n"
            f"• *Scan ID:* `{scan_id}`\n"
            f"• *Capsule Version:* `v{version}`\n"
            f"• *SHA-256 Digest:* `{sha256_hash}`\n"
            f"• *Tamper-Evident Ledger:* Intact and chronologically chained\n"
            f"• *Gate:* Awaiting explicit Human Approval before implementation plan unlocks."
        )
        self._fire_and_forget(self.client.post_message(body))

    def notify_approval_recorded(
        self,
        scan_id: str,
        package_name: str,
        decision: str,
        notes: Optional[str] = None,
        capsule_sha256: Optional[str] = None,
    ):
        """Announce developer review decision."""
        dec_emoji = "✅" if decision.upper() == "APPROVED" else "❌"
        hash_info = f"\n• *Bound Capsule Hash:* `{capsule_sha256}`" if capsule_sha256 else ""
        notes_info = f"\n• *Developer Notes:* {notes}" if notes else ""
        body = (
            f"{dec_emoji} *[exit-planner]* Developer Review Gate Decision Recorded\n"
            f"• *Scan ID:* `{scan_id}`\n"
            f"• *Package:* `{package_name}`\n"
            f"• *Decision:* **{decision.upper()}**{hash_info}{notes_info}\n"
            f"• *Status:* {'Unlocking 15-point implementation plan & coding agent prompt' if decision.upper() == 'APPROVED' else 'Migration rejected by developer'}."
        )
        self._fire_and_forget(self.client.post_message(body))

    def notify_plan_generated(self, scan_id: str, package_name: str, candidate_package: str, step_count: int = 15):
        """Announce implementation plan generation."""
        body = (
            f"📋 *[exit-planner]* Implementation Plan Ready ({step_count} Points)\n"
            f"• *Scan ID:* `{scan_id}`\n"
            f"• *Target:* `{package_name}` ➔ `{candidate_package}`\n"
            f"• *Roadmap:* {step_count} verified, sequential migration steps generated\n"
            f"• *Directives:* Coding agent prompt ready for developer copy/paste."
        )
        self._fire_and_forget(self.client.post_message(body))


# Default global instance
default_dispatcher = SwitchEventDispatcher()

