from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import BASE_DIR, settings
from app.core.auth import get_session, purge_legacy_git_credentials
from app.database import init_db
from app.routes.scan import router as scan_router
from app.routes.dependencies import router as dep_router
from app.routes.verification import router as ver_router
from app.routes.approval import router as app_router
from app.routes.planner import router as plan_router
from app.routes.capsule import router as cap_router
from app.routes.post_verification import router as post_ver_router
from app.routes.settings_route import router as settings_router
from app.routes.auth_github import router as github_router
from app.routes.switch_route import router as switch_router
from app.routes.audit_logs import router as audit_router

PUBLIC_API_PREFIXES = (
    "/api/health",
    "/api/auth/github/status",
    "/api/auth/github/login",
    "/api/auth/github/callback",
    "/api/switch",
    "/api/audit-logs",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    cleaned = purge_legacy_git_credentials()
    if cleaned:
        print(f"[security] Removed embedded git credentials from {cleaned} workspace(s).")
    yield


app = FastAPI(
    title="Exit Capsule Generator API",
    description="AI-Powered Python Dependency Resilience and Migration Planning Tool",
    version="1.0.0",
    lifespan=lifespan,
)

_origins = list(settings.cors_origins)
if settings.FRONTEND_URL.strip():
    _origins.append(settings.FRONTEND_URL.strip().rstrip("/"))
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins or (["*"] if not settings.REQUIRE_AUTH else []),
    allow_credentials=bool(_origins),
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-Session-ID"],
)


@app.middleware("http")
async def require_github_session(request: Request, call_next):
    if settings.REQUIRE_AUTH and request.url.path.startswith("/api"):
        path = request.url.path
        if not any(path.startswith(p) for p in PUBLIC_API_PREFIXES):
            if request.method not in ("GET", "HEAD", "OPTIONS"):
                origin = request.headers.get("origin")
                if origin and origin.rstrip("/") not in _origins:
                    return JSONResponse(status_code=403, content={"detail": "Cross-origin request rejected."})
            if not get_session(request):
                return JSONResponse(status_code=401, content={"detail": "GitHub authorization required."})
    return await call_next(request)


app.include_router(scan_router)
app.include_router(dep_router)
app.include_router(ver_router)
app.include_router(app_router)
app.include_router(plan_router)
app.include_router(cap_router)
app.include_router(post_ver_router)
app.include_router(settings_router)
app.include_router(github_router)
app.include_router(switch_router)
app.include_router(audit_router)


frontend_dist = BASE_DIR.parent / "frontend" / "dist"
if frontend_dist.exists():
    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        candidate = (frontend_dist / full_path).resolve()
        if full_path and frontend_dist in candidate.parents and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(frontend_dist / "index.html")
else:
    import logging

    logging.warning(
        "frontend/dist not found - the web UI will NOT be served. "
        "Build it first: cd frontend && npm ci && npm run build"
    )
