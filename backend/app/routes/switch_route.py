import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field

from app.switch.client import (
    SwitchClient,
    SwitchUnavailable,
    build_workforce,
    pick_notification_room,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/switch", tags=["Switch Multi-Agent Collaboration"])


class NotifyRequest(BaseModel):
    message: Optional[str] = None
    body: Optional[str] = None
    room_id: Optional[str] = None


@router.get("/status")
def get_switch_status():
    """Retrieve live Switch server availability, workforce roster, and connected rooms."""
    try:
        with SwitchClient() as client:
            agents = client.list_agents()
            rooms = client.list_rooms()
            detailed_rooms = []
            for r in rooms:
                try:
                    detail = client.room_detail(r["id"])
                    merged = dict(r)
                    merged.update(detail)
                    detailed_rooms.append(merged)
                except Exception:
                    detailed_rooms.append(r)

            workforce = build_workforce(agents, detailed_rooms)
            return {
                "available": True,
                "workforce": workforce,
                "rooms": detailed_rooms,
                "error": None,
            }
    except Exception as exc:
        logger.info("Switch server unavailable: %s", exc)
        return {
            "available": False,
            "workforce": [],
            "rooms": [],
            "error": str(exc),
        }


@router.get("/workforce")
def get_switch_workforce():
    """Retrieve the 6-agent workforce with active registration and room presence."""
    status = get_switch_status()
    workforce = status.get("workforce", [])
    return {
        "agents": workforce,
        "total": len(workforce),
        "available": status.get("available", False),
    }


@router.get("/rooms")
def get_switch_rooms():
    """List collaboration rooms and connected bridges."""
    status = get_switch_status()
    rooms = status.get("rooms", [])
    return {
        "rooms": rooms,
        "slack_room": next((r for r in rooms if r.get("bridge_type") == "slack" or "action" in r.get("name", "").lower()), None),
        "war_room": next((r for r in rooms if "war-room" in r.get("name", "").lower() or "dependencey" in r.get("name", "").lower()), None),
    }


@router.get("/rooms/{room_id}/messages")
def get_room_messages(room_id: str, limit: int = Query(50, ge=1, le=100)):
    """Retrieve actual messages from a Switch room for real collaboration observability."""
    try:
        with SwitchClient() as client:
            cookie = client._login(client._client())
            resp = client._client().get(
                f"/gateway/chats/{room_id}/messages?limit={limit}",
                headers={"Cookie": cookie}
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=f"Switch error: {resp.text}")
            data = resp.json()
            messages = data.get("messages", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])
            return {
                "room_id": room_id,
                "messages": messages,
                "total": len(messages)
            }
    except HTTPException:
        raise
    except Exception as exc:
        logger.info("Switch messages error: %s", exc)
        return {
            "room_id": room_id,
            "messages": [],
            "total": 0,
            "error": str(exc)
        }


@router.post("/notify")
def send_switch_notification(req: NotifyRequest):
    """Post a milestone or announcement into the Switch collaboration room."""
    text = req.message or req.body
    if not text:
        raise HTTPException(status_code=400, detail="Missing notification message")

    try:
        with SwitchClient() as client:
            rooms = client.list_rooms()
            target = pick_notification_room(rooms, preferred_id=req.room_id or "")
            if not target or "id" not in target:
                raise HTTPException(status_code=404, detail="No suitable Switch room found")
            client.post_message(target["id"], text)
            return {
                "status": "sent",
                "room_id": target["id"],
                "room_name": target.get("name"),
            }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Switch error: {exc}")
