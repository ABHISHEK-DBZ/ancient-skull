from datetime import datetime, timezone


def iso_now() -> str:
    """UTC ISO 8601 timestamp that JavaScript parses natively."""
    return datetime.now(timezone.utc).isoformat(timespec="seconds")
