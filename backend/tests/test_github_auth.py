import time

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.token_cipher import encrypt_token
from app.database import get_db_connection

client = TestClient(app)

def test_github_status_unconfigured(monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "GITHUB_CLIENT_ID", "")
    monkeypatch.setattr(settings, "GITHUB_CLIENT_SECRET", "")
    
    resp = client.get("/api/auth/github/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["configured"] is False
    assert data["connected"] is False

def test_github_login_unconfigured(monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "GITHUB_CLIENT_ID", "")
    
    resp = client.get("/api/auth/github/login")
    assert resp.status_code == 400
    assert "not configured" in resp.json()["detail"].lower()

def test_github_login_configured(monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "GITHUB_CLIENT_ID", "test_client_id_123")
    monkeypatch.setattr(settings, "GITHUB_CLIENT_SECRET", "test_secret_456")
    
    resp = client.get("/api/auth/github/login")
    assert resp.status_code == 200
    data = resp.json()
    assert "auth_url" in data
    assert "test_client_id_123" in data["auth_url"]
    assert "state=" in data["auth_url"]
    assert data["redirect_uri"].endswith("/auth/callback")

def test_redirect_uri_ignores_stale_localhost_config(monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "GITHUB_CLIENT_ID", "test_client_id_123")
    monkeypatch.setattr(settings, "GITHUB_CLIENT_SECRET", "test_secret_456")
    monkeypatch.setattr(settings, "GITHUB_REDIRECT_URI", "http://localhost:5173/auth/callback")
    monkeypatch.setattr(settings, "APP_BASE_URL", "https://exit-capsule-lexacore.azurewebsites.net")

    resp = client.get(
        "/api/auth/github/login",
        headers={"Origin": "https://exit-capsule-lexacore.azurewebsites.net"},
    )
    assert resp.status_code == 200
    assert resp.json()["redirect_uri"] == "https://exit-capsule-lexacore.azurewebsites.net/auth/callback"

def test_github_disconnect_and_session():
    session_id = "test_sess_abc"
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO github_sessions
            (session_id, access_token, username, name, avatar_url, created_at, github_id, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (session_id, encrypt_token("mock_token"), "testuser", "Test User",
              "https://avatar.com/test", "2026-01-01T00:00:00+00:00", "42", time.time() + 3600))
        conn.commit()

    # Status check with session header (cookie storage is exercised in the browser flow)
    resp = client.get("/api/auth/github/status", headers={"X-Session-ID": session_id})
    assert resp.status_code == 200
    data = resp.json()
    assert data["connected"] is True
    assert data["user"]["username"] == "testuser"

    # Disconnect
    disc_resp = client.post("/api/auth/github/disconnect", headers={"X-Session-ID": session_id})
    assert disc_resp.status_code == 200
    assert disc_resp.json()["status"] == "DISCONNECTED"

    # Verify session is gone
    after_resp = client.get("/api/auth/github/status", headers={"X-Session-ID": session_id})
    assert after_resp.status_code == 200
    assert after_resp.json()["connected"] is False
