import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from app.config import settings

SCHEMA_VERSION = 5


class _ClosingConnection(sqlite3.Connection):
    """sqlite3's context manager only commits; this also closes the handle."""

    def __exit__(self, exc_type, exc, tb):
        try:
            return super().__exit__(exc_type, exc, tb)
        finally:
            self.close()


def _db_file() -> Path:
    db_path = Path(settings.DATABASE_PATH)
    if not db_path.is_absolute():
        backend_db = settings.BASE_DIR / db_path.name
        if backend_db.exists():
            return backend_db.resolve()
        return (settings.BASE_DIR / db_path).resolve()
    if not db_path.exists() and (settings.BASE_DIR / db_path.name).exists():
        return settings.BASE_DIR / db_path.name
    return db_path


def get_db_connection() -> sqlite3.Connection:
    """Get a SQLite connection that commits on success and always closes."""
    conn = sqlite3.connect(str(_db_file()), factory=_ClosingConnection, timeout=15.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA busy_timeout = 5000")
    try:
        conn.execute("PRAGMA journal_mode = WAL")
    except sqlite3.OperationalError:
        pass
    return conn


def _columns(conn: sqlite3.Connection, table: str) -> set[str]:
    return {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}


def _add_column(conn: sqlite3.Connection, table: str, definition: str) -> None:
    column = definition.split()[0]
    if column not in _columns(conn, table):
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {definition}")


def init_db() -> None:
    """Create/upgrade the schema. Safe to call on every startup."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        version = cursor.execute("PRAGMA user_version").fetchone()[0]

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS scans (
            scan_id TEXT PRIMARY KEY,
            repo_path TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            summary_json TEXT,
            error_message TEXT
        )
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS dependencies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            scan_id TEXT NOT NULL,
            package_name TEXT NOT NULL,
            declared_version TEXT,
            category TEXT NOT NULL,
            risk_score REAL DEFAULT 0.0,
            risk_breakdown_json TEXT,
            pypi_metadata_json TEXT,
            ast_usage_json TEXT,
            created_at TEXT NOT NULL,
            UNIQUE(scan_id, package_name)
        )
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS ai_recommendations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            scan_id TEXT NOT NULL,
            package_name TEXT NOT NULL,
            candidate_replacement TEXT NOT NULL,
            model_name TEXT NOT NULL,
            recommendation_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE(scan_id, package_name)
        )
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS verification_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            scan_id TEXT NOT NULL,
            package_name TEXT NOT NULL,
            check_name TEXT NOT NULL,
            status TEXT NOT NULL,
            evidence TEXT,
            error_details TEXT,
            command_executed TEXT,
            elapsed_seconds REAL DEFAULT 0.0,
            created_at TEXT NOT NULL
        )
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS approval_decisions (
            scan_id TEXT NOT NULL,
            package_name TEXT NOT NULL,
            decision TEXT NOT NULL,
            notes TEXT,
            decided_at TEXT NOT NULL,
            PRIMARY KEY (scan_id, package_name)
        )
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS approval_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            scan_id TEXT NOT NULL,
            package_name TEXT NOT NULL,
            decision TEXT NOT NULL,
            notes TEXT,
            decided_at TEXT NOT NULL
        )
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS capsules (
            scan_id TEXT PRIMARY KEY,
            capsule_json_path TEXT NOT NULL,
            capsule_md_path TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS capsule_versions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            scan_id TEXT NOT NULL,
            version INTEGER NOT NULL,
            capsule_json_path TEXT NOT NULL,
            capsule_md_path TEXT NOT NULL,
            sha256 TEXT NOT NULL,
            prev_sha256 TEXT,
            created_at TEXT NOT NULL,
            UNIQUE(scan_id, version)
        )
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS implementation_plans (
            scan_id TEXT NOT NULL,
            package_name TEXT NOT NULL,
            plan_json TEXT NOT NULL,
            plan_md TEXT NOT NULL,
            agent_prompt TEXT NOT NULL,
            created_at TEXT NOT NULL,
            PRIMARY KEY (scan_id, package_name)
        )
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS post_verifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            scan_id TEXT NOT NULL,
            working_copy_path TEXT NOT NULL,
            diff_summary TEXT,
            status TEXT NOT NULL,
            checks_json TEXT NOT NULL,
            report_md TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS agent_reviews (
            scan_id TEXT PRIMARY KEY,
            room_id TEXT NOT NULL,
            request_seq INTEGER NOT NULL DEFAULT 0,
            request_message_id TEXT,
            digest TEXT,
            handles_json TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS agent_verifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            scan_id TEXT NOT NULL,
            agent_name TEXT NOT NULL,
            role TEXT NOT NULL,
            message_id TEXT NOT NULL,
            body TEXT NOT NULL,
            capsule_sha256 TEXT,
            created_at TEXT NOT NULL,
            UNIQUE(scan_id, message_id)
        )
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            login TEXT NOT NULL,
            name TEXT,
            avatar_url TEXT,
            created_at TEXT NOT NULL,
            last_login_at TEXT NOT NULL
        )
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS github_sessions (
            session_id TEXT PRIMARY KEY,
            access_token TEXT NOT NULL,
            username TEXT,
            name TEXT,
            avatar_url TEXT,
            created_at TEXT NOT NULL
        )
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS oauth_states (
            state TEXT PRIMARY KEY,
            redirect_uri TEXT NOT NULL,
            created_at REAL NOT NULL,
            used INTEGER NOT NULL DEFAULT 0
        )
        """)

        # --- additive migrations ---
        _add_column(conn, "scans", "local_path TEXT")
        _add_column(conn, "scans", "owner_id TEXT")
        _add_column(conn, "scans", "progress_pct INTEGER NOT NULL DEFAULT 0")
        _add_column(conn, "scans", "current_step TEXT")
        _add_column(conn, "github_sessions", "github_id TEXT")
        _add_column(conn, "github_sessions", "expires_at REAL")
        _add_column(conn, "github_sessions", "refresh_token TEXT")
        _add_column(conn, "github_sessions", "scopes TEXT")
        # TD-01: bind every approval to the exact capsule seal that was reviewed.
        _add_column(conn, "approval_decisions", "capsule_sha256 TEXT")
        _add_column(conn, "approval_decisions", "capsule_version INTEGER")
        _add_column(conn, "approval_history", "capsule_sha256 TEXT")
        _add_column(conn, "approval_history", "capsule_version INTEGER")

        if version < 3:
            # Old rows stored plaintext tokens and were written into clone URLs.
            # They are compromised by design; force a fresh authorization.
            cursor.execute("DELETE FROM github_sessions")
            for table in ("scans", "dependencies"):
                for row in cursor.execute(f"SELECT rowid, created_at FROM {table}").fetchall():
                    try:
                        stamp = float(row[1])
                    except (TypeError, ValueError):
                        continue
                    cursor.execute(
                        f"UPDATE {table} SET created_at = ? WHERE rowid = ?",
                        (datetime.fromtimestamp(stamp, timezone.utc).isoformat(timespec="seconds"), row[0]),
                    )

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_scans_owner ON scans(owner_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_deps_scan ON dependencies(scan_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ver_scan_pkg ON verification_runs(scan_id, package_name)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_plans_scan ON implementation_plans(scan_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_capsule_versions_scan ON capsule_versions(scan_id, version)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_approval_history_scan ON approval_history(scan_id, package_name)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON github_sessions(expires_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_oauth_states_created ON oauth_states(created_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_agent_verifications_scan ON agent_verifications(scan_id)")

        cursor.execute(f"PRAGMA user_version = {SCHEMA_VERSION}")
        conn.commit()


# Run DB initialization on import so CLI paths and tests see the schema.
init_db()
