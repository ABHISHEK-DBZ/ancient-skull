"""Ask the Slack-bridged agents to review a sealed capsule (advisory only)."""

import json
import logging
from typing import Any, Dict, Iterable, List

from app.core.clock import iso_now
from app.database import get_db_connection
from app.switch.client import SwitchClient, pick_notification_room, resolve_agent_role

logger = logging.getLogger(__name__)

REVIEW_ROLES = ("exit-verifier", "exit-analyst")
STAGING_PREFIX = "starting a session"


def build_review_prompt(scan_id: str, digest: str, summary: Dict[str, Any], handles: Iterable[str]) -> str:
    mentions = " ".join(f"@{handle}" for handle in handles)
    return (
        f"{mentions} independently verify this sealed exit capsule. "
        f"Scan: {scan_id}. Capsule SHA-256: {digest or 'not sealed'}. "
        f"Scope: {summary.get('total_dependencies', 0)} dependencies, "
        f"{summary.get('critical_risk_count', 0)} critical, {summary.get('high_risk_count', 0)} high risk. "
        "Reply PASS, WARN, or FAIL with a one-line reason and the evidence you used. Do not modify files."
    )


def new_replies(messages: List[Dict[str, Any]], handles: Iterable[str], after_seq: int) -> List[Dict[str, Any]]:
    """Return agent replies that arrived after the review request."""
    allowed = set(handles)
    replies = []
    for message in messages:
        sender = message.get("sender") or {}
        body = (message.get("body") or "").strip()
        if sender.get("kind") != "agent" or sender.get("name") not in allowed:
            continue
        if (message.get("seq") or 0) <= after_seq:
            continue
        if not body or body.lower().startswith(STAGING_PREFIX):
            continue
        replies.append(message)
    return replies


def request_review(scan_id: str, digest: str, summary: Dict[str, Any]) -> None:
    """Post the review request to the Slack room. Best effort, never raises."""
    try:
        with SwitchClient() as client:
            rooms = client.list_rooms()
            room = next((r for r in rooms if r.get("bridge_type") == "slack"), None) or pick_notification_room(rooms)
            if not room:
                return
            by_role = {resolve_agent_role(a.get("name", "")): a.get("name", "") for a in client.list_agents()}
            handles = list(dict.fromkeys(by_role[role] for role in REVIEW_ROLES if by_role.get(role)))
            if not handles:
                return
            baseline = max((m.get("seq") or 0 for m in client.list_messages(room["id"], 100)), default=0)
            sent = client.post_message(room["id"], build_review_prompt(scan_id, digest, summary, handles))
            posted = (sent.get("messages") or [{}])[0] if isinstance(sent, dict) else {}
            request_seq = posted.get("seq") or baseline
            with get_db_connection() as conn:
                conn.execute(
                    "INSERT OR REPLACE INTO agent_reviews "
                    "(scan_id, room_id, request_seq, request_message_id, digest, handles_json, created_at) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (
                        scan_id,
                        room["id"],
                        request_seq,
                        posted.get("messageId"),
                        digest,
                        json.dumps(handles),
                        iso_now(),
                    ),
                )
                conn.commit()
    except Exception as exc:
        logger.info("Slack agent review skipped: %s", exc)


def sync_replies(scan_id: str) -> List[Dict[str, Any]]:
    """Pull new agent replies into the DB, then return every stored verdict."""
    with get_db_connection() as conn:
        review = conn.execute("SELECT * FROM agent_reviews WHERE scan_id = ?", (scan_id,)).fetchone()

    if review:
        try:
            handles = json.loads(review["handles_json"] or "[]")
            with SwitchClient() as client:
                messages = client.list_messages(review["room_id"], 100)
            with get_db_connection() as conn:
                for message in new_replies(messages, handles, review["request_seq"] or 0):
                    sender = message.get("sender") or {}
                    name = sender.get("name") or ""
                    conn.execute(
                        "INSERT OR IGNORE INTO agent_verifications "
                        "(scan_id, agent_name, role, message_id, body, capsule_sha256, created_at) "
                        "VALUES (?, ?, ?, ?, ?, ?, ?)",
                        (
                            scan_id,
                            name,
                            resolve_agent_role(name),
                            message.get("messageId"),
                            (message.get("body") or "").strip(),
                            review["digest"],
                            iso_now(),
                        ),
                    )
                conn.commit()
        except Exception as exc:
            logger.info("Slack agent reply sync skipped: %s", exc)

    with get_db_connection() as conn:
        rows = conn.execute(
            "SELECT agent_name, role, message_id, body, capsule_sha256, created_at "
            "FROM agent_verifications WHERE scan_id = ? ORDER BY id",
            (scan_id,),
        ).fetchall()
    return [dict(row) for row in rows]
