import json
import logging
import os
import re
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional
import httpx

from app.config import settings

logger = logging.getLogger(__name__)


def _switch_env_path() -> Optional[Path]:
    appdata = os.environ.get("APPDATA")
    if not appdata:
        return None
    path = Path(appdata) / "switchdash" / "local-switch-server" / "native" / "run" / "switch-core.env"
    return path if path.exists() else None


def _local_switch_env() -> Dict[str, str]:
    """Read the Console-managed local Switch env (never logged)."""
    path = _switch_env_path()
    if path is None:
        return {}
    values: Dict[str, str] = {}
    try:
        for line in path.read_text(encoding="utf-8").splitlines():
            if "=" not in line or line.lstrip().startswith("#"):
                continue
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip().strip('"').strip("'")
    except OSError:
        return {}
    return values


def discover_local_switch() -> Dict[str, str]:
    """Return local Switch gateway defaults without exposing credentials."""
    env = _local_switch_env()
    port = env.get("SERVER_PORT") or "60398"
    return {
        "gateway_url": f"http://127.0.0.1:{port}",
        "email": env.get("GATEWAY_ADMIN_EMAIL", ""),
    }

CANONICAL_ROLES = [
    "exit-orchestrator",
    "exit-analyst",
    "exit-architect",
    "exit-verifier",
    "exit-auditor",
    "exit-planner",
]
SPECIALIST_ROLES = CANONICAL_ROLES

ROLE_DESCRIPTIONS = {
    "exit-orchestrator": "Coordinates the entire project, task assignments, and blocker resolution.",
    "exit-analyst": "Analyzes dependency health, AST usage mapping, and maintenance/compatibility risks.",
    "exit-architect": "Designs migration strategies, evaluates alternatives, and shapes replacement architecture.",
    "exit-verifier": "Tests migration proposals independently in isolated ephemeral environments.",
    "exit-auditor": "Reviews verification evidence, checks capsule integrity, and ensures security compliance.",
    "exit-planner": "Generates prioritized 15-point implementation plans and AI agent directives.",
}


class SwitchUnavailable(Exception):
    """Raised when the Switch server cannot be reached or rejects authentication."""
    pass


def resolve_agent_role(name: str) -> str:
    """Normalize agent name to canonical workforce role."""
    clean = (name or "").lower().strip()
    if clean in ("exit-verify", "exit_verify"):
        return "exit-verifier"
    return clean


def build_workforce(agents: List[Dict[str, Any]], rooms: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Build the status for all 6 canonical specialist roles by correlating
    registered Switch agents and their room presences.
    """
    # Map from role -> agent record
    by_role: Dict[str, Dict[str, Any]] = {}
    for a in agents:
        role = resolve_agent_role(a.get("name", ""))
        if role in CANONICAL_ROLES:
            by_role[role] = a

    # Map from agent_id -> {rooms: [names], status: "live" if any room has status live}
    agent_rooms: Dict[str, List[str]] = {}
    agent_status_in_rooms: Dict[str, str] = {}
    for r in rooms:
        r_name = r.get("name", "")
        for aid in r.get("agent_ids", []):
            agent_rooms.setdefault(aid, []).append(r_name)
        statuses = r.get("agent_statuses", {})
        for aid, st in statuses.items():
            if st == "live":
                agent_status_in_rooms[aid] = "live"
            elif aid not in agent_status_in_rooms:
                agent_status_in_rooms[aid] = st

    workforce = []
    for role in CANONICAL_ROLES:
        agent = by_role.get(role)
        if agent is None:
            workforce.append({
                "role": role,
                "name": role,
                "registered": False,
                "status": "missing",
                "description": ROLE_DESCRIPTIONS.get(role, ""),
                "connector_type": "",
                "rooms": [],
                "id": None,
            })
        else:
            aid = agent.get("id")
            rooms_for_agent = agent_rooms.get(aid, [])
            status = agent_status_in_rooms.get(aid) or ("live" if rooms_for_agent else "registered")
            workforce.append({
                "role": role,
                "name": agent.get("name", role),
                "registered": True,
                "status": status,
                "description": agent.get("description") or ROLE_DESCRIPTIONS.get(role, ""),
                "connector_type": agent.get("connector_type") or agent.get("connectorType") or "",
                "rooms": rooms_for_agent,
                "id": aid,
            })

    return workforce


def pick_notification_room(
    rooms: List[Dict[str, Any]],
    preferred_name: str = "",
    preferred_id: str = "",
) -> Optional[Dict[str, Any]]:
    """
    Pick the best room for notifications:
    1. Match preferred_id if given.
    2. Match preferred_name if given.
    3. Prefer rooms named 'dependency-war-room' or containing 'war-room'.
    4. Prefer bridged rooms (slack or telegram).
    5. Fall back to the first available room.
    """
    if not rooms:
        return None

    if preferred_id:
        for r in rooms:
            if r.get("id") == preferred_id:
                return r

    if preferred_name:
        for r in rooms:
            if r.get("name") == preferred_name:
                return r

    # Preference: war room
    for r in rooms:
        name = (r.get("name") or "").lower()
        if "dependency-war-room" in name or "war-room" in name or "war_room" in name:
            return r

    # Preference: bridged room
    for r in rooms:
        if r.get("bridge_type") or r.get("bridge") in ("slack", "telegram"):
            return r

    return rooms[0]


class SwitchClient:
    """Client for communicating with the local Switch Gateway API."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        email: Optional[str] = None,
        password: Optional[str] = None,
        transport: Optional[httpx.BaseTransport] = None,
    ):
        local = _local_switch_env()
        raw_url = (
            base_url
            or getattr(settings, "SWITCH_GATEWAY_URL", "")
            or discover_local_switch()["gateway_url"]
        )
        self.base_url = raw_url.rstrip("/")
        self.email = email or getattr(settings, "SWITCH_ADMIN_EMAIL", "") or local.get("GATEWAY_ADMIN_EMAIL", "")
        self.password = password or getattr(settings, "SWITCH_ADMIN_PASSWORD", "") or local.get("GATEWAY_ADMIN_PASSWORD", "")
        self.transport = transport
        self._cookie: Optional[str] = None
        self._http_client: Optional[httpx.Client] = None

    def __enter__(self):
        self._http_client = httpx.Client(
            base_url=self.base_url,
            transport=self.transport,
            timeout=10.0,
        )
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self._http_client:
            self._http_client.close()
            self._http_client = None

    def _client(self) -> httpx.Client:
        if self._http_client is not None:
            return self._http_client
        return httpx.Client(base_url=self.base_url, transport=self.transport, timeout=10.0)

    def _login(self, client: httpx.Client) -> str:
        if self._cookie:
            return self._cookie
        if not self.email or not self.password:
            raise SwitchUnavailable(
                "Switch admin credentials are not configured; set SWITCH_ADMIN_EMAIL/SWITCH_ADMIN_PASSWORD"
            )

        login_url = "/gateway/auth/login"
        payload = {"email": self.email, "password": self.password}
        try:
            resp = client.post(login_url, json=payload)
            if resp.status_code != 200:
                raise SwitchUnavailable(f"Switch login failed with status {resp.status_code}")
            set_cookie = resp.headers.get("set-cookie", "")
            if "switch_auth=" not in set_cookie:
                raise SwitchUnavailable("Switch login response missing switch_auth cookie")
            self._cookie = set_cookie.split(";")[0]
            return self._cookie
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            raise SwitchUnavailable(f"Cannot connect to Switch server at {self.base_url}: {exc}") from exc

    def list_agents(self) -> List[Dict[str, Any]]:
        """List registered agents from Switch Gateway."""
        client = self._client()
        should_close = self._http_client is None
        try:
            cookie = self._login(client)
            resp = client.get("/gateway/agents", headers={"Cookie": cookie})
            if resp.status_code != 200:
                raise SwitchUnavailable(f"Failed to list agents (HTTP {resp.status_code})")
            return resp.json()
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            raise SwitchUnavailable(f"Switch connection failed: {exc}") from exc
        finally:
            if should_close:
                client.close()

    def list_rooms(self) -> List[Dict[str, Any]]:
        """List rooms from Switch Gateway with bridge metadata."""
        client = self._client()
        should_close = self._http_client is None
        try:
            cookie = self._login(client)
            resp = client.get("/gateway/rooms", headers={"Cookie": cookie})
            if resp.status_code != 200:
                raise SwitchUnavailable(f"Failed to list rooms (HTTP {resp.status_code})")
            rooms = resp.json()
            for r in rooms:
                name = (r.get("name") or "").lower()
                if "action" in name or r.get("id") == getattr(settings, "SWITCH_ROOM", ""):
                    r["bridge_type"] = "slack"
                elif "war-room" in name or "dependencey" in name:
                    r["bridge_type"] = "telegram"
                elif "bridge_type" not in r:
                    r["bridge_type"] = None
            return rooms
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            raise SwitchUnavailable(f"Switch connection failed: {exc}") from exc
        finally:
            if should_close:
                client.close()

    def room_detail(self, room_id: str) -> Dict[str, Any]:
        """Fetch detail of a specific room."""
        client = self._client()
        should_close = self._http_client is None
        try:
            cookie = self._login(client)
            resp = client.get(f"/gateway/rooms/{room_id}", headers={"Cookie": cookie})
            if resp.status_code != 200:
                raise SwitchUnavailable(f"Failed to get room detail (HTTP {resp.status_code})")
            return resp.json()
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            raise SwitchUnavailable(f"Switch connection failed: {exc}") from exc
        finally:
            if should_close:
                client.close()

    def list_messages(self, room_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """List recent messages in a room."""
        client = self._client()
        should_close = self._http_client is None
        try:
            cookie = self._login(client)
            resp = client.get(f"/gateway/chats/{room_id}/messages?limit={limit}", headers={"Cookie": cookie})
            if resp.status_code != 200:
                raise SwitchUnavailable(f"Failed to list messages (HTTP {resp.status_code})")
            data = resp.json()
            return data.get("messages", []) if isinstance(data, dict) else data
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            raise SwitchUnavailable(f"Switch connection failed: {exc}") from exc
        finally:
            if should_close:
                client.close()

    def post_message(self, room_id: str, body: str) -> Dict[str, Any]:
        """Post a message to a Switch room (relayed to bridge)."""
        client = self._client()
        should_close = self._http_client is None
        try:
            cookie = self._login(client)
            payload = {
                "body": body,
                "requestId": str(uuid.uuid4()),
            }
            resp = client.post(
                f"/gateway/chats/{room_id}/messages",
                json=payload,
                headers={"Cookie": cookie},
            )
            if resp.status_code != 200:
                raise SwitchUnavailable(f"Failed to post message (HTTP {resp.status_code})")
            return resp.json()
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            raise SwitchUnavailable(f"Switch connection failed: {exc}") from exc
        finally:
            if should_close:
                client.close()


def notify_milestone(message: str, room_id: Optional[str] = None) -> bool:
    """Best-effort notification to the active Switch collaboration room."""
    try:
        with SwitchClient() as client:
            rooms = client.list_rooms()
            target = pick_notification_room(rooms, preferred_name=getattr(settings, "SWITCH_ROOM", ""), preferred_id=room_id or "")
            if target and "id" in target:
                client.post_message(target["id"], message)
                return True
            return False
    except Exception as exc:
        logger.info("Switch milestone notification skipped: %s", exc)
        return False
