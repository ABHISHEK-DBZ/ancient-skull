import json

import httpx
import pytest

from app.routes import switch_route
from app.switch.client import (
    SwitchClient,
    SwitchUnavailable,
    build_workforce,
    pick_notification_room,
    resolve_agent_role,
)


def test_role_alias_keeps_switch_identity():
    assert resolve_agent_role("exit-verify") == "exit-verifier"
    assert resolve_agent_role("exit-analyst") == "exit-analyst"


def test_workforce_marks_missing_architect():
    agents = [
        {"id": "a1", "name": "exit-verify", "description": "verifier"},
        {"id": "a2", "name": "exit-analyst", "description": "analyst", "connectorType": "Codex CLI"},
    ]
    rooms = [{"id": "r1", "name": "action", "agent_ids": ["a1"], "agent_statuses": {"a1": "live"}}]
    workforce = {item["role"]: item for item in build_workforce(agents, rooms)}

    assert workforce["exit-verifier"]["registered"] is True
    assert workforce["exit-verifier"]["status"] == "live"
    assert workforce["exit-verifier"]["rooms"] == ["action"]
    assert workforce["exit-analyst"]["status"] == "registered"
    assert workforce["exit-analyst"]["connector_type"] == "Codex CLI"
    assert workforce["exit-architect"]["registered"] is False


def test_pick_notification_room_prefers_requested_then_bridge():
    rooms = [
        {"id": "r1", "name": "plain"},
        {"id": "r2", "name": "action", "bridge_type": "slack"},
        {"id": "r3", "name": "dependency-war-room", "bridge_type": "telegram"},
    ]
    assert pick_notification_room(rooms, "", "r1")["id"] == "r1"
    assert pick_notification_room(rooms)["id"] == "r3"
    assert pick_notification_room(rooms, "action")["id"] == "r2"


def test_client_logs_in_and_posts_camel_case():
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        if request.url.path == "/gateway/auth/login":
            return httpx.Response(200, json={}, headers={"set-cookie": "switch_auth=token; Path=/"})
        assert request.headers.get("cookie") == "switch_auth=token"
        if request.url.path == "/gateway/agents":
            return httpx.Response(200, json=[{"id": "a1", "name": "exit-planner"}])
        if request.url.path == "/gateway/chats/r1/messages":
            body = json.loads(request.content)
            assert body["requestId"]
            assert body["body"] == "hello"
            return httpx.Response(200, json={"messages": []})
        return httpx.Response(404)

    with SwitchClient(base_url="http://switch.test", email="a@b.c", password="pw",
                      transport=httpx.MockTransport(handler)) as client:
        assert client.list_agents()[0]["name"] == "exit-planner"
        client.post_message("r1", "hello")

    assert [call.url.path for call in calls] == [
        "/gateway/auth/login",
        "/gateway/agents",
        "/gateway/chats/r1/messages",
    ]


def test_client_lists_room_messages():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/gateway/auth/login":
            return httpx.Response(200, json={}, headers={"set-cookie": "switch_auth=token; Path=/"})
        if request.url.path == "/gateway/chats/r1/messages":
            assert request.method == "GET"
            return httpx.Response(200, json={"messages": [{"messageId": "m1", "seq": 3}]})
        return httpx.Response(404)

    with SwitchClient(base_url="http://switch.test", email="a@b.c", password="pw",
                      transport=httpx.MockTransport(handler)) as client:
        assert client.list_messages("r1")[0]["seq"] == 3


class _FakeClient:
    base_url = "http://fake-switch"

    def __enter__(self):
        return self

    def __exit__(self, *_exc):
        return None

    def list_agents(self):
        return [{"id": "a1", "name": "exit-verify", "description": "verifier"}]

    def list_rooms(self):
        return [{"id": "r1", "name": "dependency-war-room", "bridge_type": "slack"}]

    def room_detail(self, room_id):
        return {"id": room_id, "name": "dependency-war-room", "agent_ids": ["a1"], "agent_statuses": {"a1": "live"}}

    def post_message(self, room_id, body):
        self.sent = (room_id, body)
        return {"messages": []}


class _DownClient(_FakeClient):
    def list_agents(self):
        raise SwitchUnavailable("Switch is down")


def test_notify_milestone_is_best_effort(monkeypatch):
    from app.switch import client as switch_client

    sent = {}

    class _Recording(_FakeClient):
        def post_message(self, room_id, body):
            sent["value"] = (room_id, body)
            return {"messages": []}

    monkeypatch.setattr(switch_client, "SwitchClient", _Recording)
    assert switch_client.notify_milestone("capsule sealed") is True
    assert sent["value"] == ("r1", "capsule sealed")

    class _Broken:
        def __enter__(self):
            raise SwitchUnavailable("Switch is down")

    monkeypatch.setattr(switch_client, "SwitchClient", _Broken)
    assert switch_client.notify_milestone("ignored") is False


def test_status_route_degrades_and_notifies(monkeypatch):
    fake = _FakeClient()
    monkeypatch.setattr(switch_route, "SwitchClient", lambda: fake)
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    status = client.get("/api/switch/status").json()
    assert status["available"] is True
    assert status["workforce"][3]["role"] == "exit-verifier"
    assert status["rooms"][0]["bridge_type"] == "slack"

    notified = client.post("/api/switch/notify", json={"message": "capsule sealed"})
    assert notified.status_code == 200
    assert notified.json()["room_id"] == "r1"
    assert fake.sent == ("r1", "capsule sealed")


def test_status_route_reports_unavailable(monkeypatch):
    monkeypatch.setattr(switch_route, "SwitchClient", lambda: _DownClient())
    from fastapi.testclient import TestClient
    from app.main import app

    status = TestClient(app).get("/api/switch/status").json()
    assert status["available"] is False
    assert "Switch is down" in status["error"]

class _NoRoomClient(_FakeClient):
    def list_rooms(self):
        return []


class _BrokenPostClient(_FakeClient):
    def post_message(self, room_id, body):
        raise RuntimeError("gateway rejected message")


def test_notify_requires_message(monkeypatch):
    from fastapi.testclient import TestClient
    from app.main import app

    monkeypatch.setattr(switch_route, "SwitchClient", lambda: _FakeClient())
    response = TestClient(app).post("/api/switch/notify", json={})
    assert response.status_code == 400


def test_notify_without_room_returns_404(monkeypatch):
    from fastapi.testclient import TestClient
    from app.main import app

    monkeypatch.setattr(switch_route, "SwitchClient", lambda: _NoRoomClient())
    response = TestClient(app).post("/api/switch/notify", json={"message": "hello"})
    assert response.status_code == 404


def test_notify_surfaces_switch_failure_as_503(monkeypatch):
    from fastapi.testclient import TestClient
    from app.main import app

    monkeypatch.setattr(switch_route, "SwitchClient", lambda: _BrokenPostClient())
    response = TestClient(app).post("/api/switch/notify", json={"message": "hello"})
    assert response.status_code == 503


def test_client_requires_credentials(monkeypatch):
    from app.switch import client as switch_client

    monkeypatch.setattr(switch_client, "_switch_env_path", lambda: None)
    monkeypatch.setattr(switch_client.settings, "SWITCH_ADMIN_EMAIL", "")
    monkeypatch.setattr(switch_client.settings, "SWITCH_ADMIN_PASSWORD", "")
    offline = SwitchClient()
    with pytest.raises(SwitchUnavailable):
        offline.list_agents()
