import os
import secrets
from pathlib import Path
from pydantic import Field

try:
    from pydantic import BaseSettings
    _PYDANTIC_V2 = False
except Exception:
    # pydantic v2 moved BaseSettings to the pydantic-settings package
    from pydantic_settings import BaseSettings, SettingsConfigDict
    _PYDANTIC_V2 = True

BASE_DIR = Path(__file__).resolve().parent.parent

# A per-install key is generated once and reused so encrypted GitHub tokens
# survive restarts. Set SECRET_KEY in the environment to share a key across
# instances; never commit the generated file.
def _load_or_create_secret() -> str:
    env_key = os.environ.get("SECRET_KEY", "").strip()
    if env_key:
        return env_key
    key_file = BASE_DIR / ".secret_key"
    if key_file.exists():
        value = key_file.read_text(encoding="utf-8").strip()
        if value:
            return value
    value = secrets.token_urlsafe(48)
    try:
        key_file.write_text(value, encoding="utf-8")
    except OSError:
        return value
    return value


class Settings(BaseSettings):
    # AI Provider Settings
    GEMMA_API_KEY: str = Field(default="", description="API key for the Gemma 4 provider")
    GEMMA_API_BASE_URL: str = Field(default="https://api.together.xyz/v1", description="Base URL for the AI provider")
    GEMMA_MODEL: str = Field(default="google/gemma-4-27b-it", description="Migration planner model")
    ENABLE_REMOTE_INFERENCE: bool = Field(default=False, description="Enable remote AI inference")

    # GitHub OAuth Settings
    GITHUB_CLIENT_ID: str = Field(default="")
    GITHUB_CLIENT_SECRET: str = Field(default="")
    GITHUB_REDIRECT_URI: str = Field(default="", description="Registered OAuth callback. Leave empty to derive from APP_BASE_URL / request origin.")
    GITHUB_OAUTH_STATE_TTL_SECONDS: int = Field(default=600)

    # Switch Console / gateway bridge. Empty values auto-detect a local Switch
    # install from %APPDATA%\switchdash (or SWITCH_GATEWAY_URL when set).
    SWITCH_GATEWAY_URL: str = Field(default="", description="Switch gateway base URL, e.g. http://127.0.0.1:60398")
    SWITCH_ADMIN_EMAIL: str = Field(default="")
    SWITCH_ADMIN_PASSWORD: str = Field(default="")
    SWITCH_ROOM: str = Field(default="", description="Preferred room id or name for milestone notifications")
    SWITCH_AGENT_REVIEW_ENABLED: bool = Field(default=True, description="Ask Slack agents to review sealed capsules")

    # Application / sessions
    APP_BASE_URL: str = Field(default="", description="Public origin, e.g. https://exit-capsule.example.com")
    FRONTEND_URL: str = Field(default="", description="Frontend origin for dev; empty = same origin")
    SECRET_KEY: str = Field(default_factory=_load_or_create_secret, description="Server key for token encryption and signing")
    SESSION_COOKIE_NAME: str = Field(default="ec_session")
    SESSION_TTL_SECONDS: int = Field(default=7 * 24 * 3600)
    SESSION_COOKIE_SECURE: bool = Field(default=False, description="Force Secure cookies (set true behind TLS)")
    REQUIRE_AUTH: bool = Field(default=False, description="Require a GitHub session for all API endpoints (true for public deployments)")

    # Security & Execution Limits
    COMMAND_TIMEOUT_SECONDS: int = Field(default=120)
    MAX_COMMAND_OUTPUT_BYTES: int = Field(default=524288)  # 512 KB
    MAX_SOURCE_SNIPPET_LINES: int = Field(default=80)
    ALLOWED_SCAN_ROOTS: str = Field(default="", description="Comma separated directories local scans may target (empty = local mode, any directory)")
    CORS_ORIGINS: str = Field(default="", description="Comma separated allowed origins in production")

    # Storage Paths
    BASE_DIR: Path = BASE_DIR
    DATABASE_PATH: str = Field(default=str(Path(__file__).resolve().parent.parent / "exit_capsule.db"))
    CAPSULES_DIR: str = Field(default=str(Path(__file__).resolve().parent.parent / "generated_capsules"))
    TEMP_WORKSPACES_DIR: str = Field(default=str(Path(__file__).resolve().parent.parent / "temp_workspaces"))

    # Server Settings
    BACKEND_HOST: str = Field(default="127.0.0.1")
    BACKEND_PORT: int = Field(default=8000)

    if _PYDANTIC_V2:
        model_config = SettingsConfigDict(env_file=(".env", "../.env"), env_file_encoding="utf-8", extra="ignore")
    else:
        class Config:
            env_file = (".env", "../.env")
            env_file_encoding = "utf-8"
            extra = "ignore"

    @property
    def allowed_scan_roots(self) -> list[Path]:
        return [Path(p).expanduser().resolve() for p in self.ALLOWED_SCAN_ROOTS.split(",") if p.strip()]

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()

# Ensure directories exist
os.makedirs(settings.CAPSULES_DIR, exist_ok=True)
os.makedirs(settings.TEMP_WORKSPACES_DIR, exist_ok=True)
