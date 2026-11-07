import os
from dataclasses import dataclass


@dataclass
class SwitchConfig:
    enabled: bool = True
    gateway_url: str = "http://127.0.0.1:60398"
    control_api_url: str = "http://127.0.0.1:54291"
    default_room_id: str = os.getenv("SWITCH_DEFAULT_ROOM_ID", "29ef14a7-572f-46d9-8d59-883d13b70f35")
    war_room_id: str = os.getenv("SWITCH_WAR_ROOM_ID", "be077a33-8063-4679-983a-e2106a34e508")
    admin_email: str = os.getenv("SWITCH_ADMIN_EMAIL", "")
    admin_password: str = os.getenv("SWITCH_ADMIN_PASSWORD", "")
    db_host: str = os.getenv("SWITCH_DB_HOST", "127.0.0.1")
    db_port: int = int(os.getenv("SWITCH_DB_PORT", "60400"))
    db_user: str = os.getenv("SWITCH_DB_USER", "postgres")
    db_password: str = os.getenv("SWITCH_DB_PASSWORD", "")
    db_name: str = os.getenv("SWITCH_DB_NAME", "switch")


def get_switch_config() -> SwitchConfig:
    """Load Switch settings from the environment; secrets are never defaulted."""
    return SwitchConfig(
        enabled=os.getenv("SWITCH_ENABLED", "true").lower() in ("1", "true", "yes"),
        gateway_url=os.getenv("SWITCH_GATEWAY_URL", "http://127.0.0.1:60398").rstrip("/"),
        control_api_url=os.getenv("SWITCH_CONTROL_API_URL", "http://127.0.0.1:54291").rstrip("/"),
    )
