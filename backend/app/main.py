from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import engine, init_db
from app.core.exceptions import AppException
from app.core.logging import configure_logging, get_logger
from app.middleware import register_middleware
from app.utils.response import error_response

configure_logging()
log = get_logger("app")


def _setup_sentry() -> None:
    """Error tracking. DSN na ho to chup-chaap skip."""
    if not settings.SENTRY_DSN:
        return
    import sentry_sdk

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.APP_ENV,
        # POS traffic bahut hai — production mein 10% trace kaafi hai
        traces_sample_rate=0.1 if settings.APP_ENV == "production" else 1.0,
        send_default_pii=False,
    )
    log.info("sentry.enabled", env=settings.APP_ENV)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _setup_sentry()

    # Schema: local/staging mein create_all se convenience, production mein
    # sirf Alembic (init_db() production mein khud raise karta hai).
    if settings.APP_ENV != "production":
        await init_db()

    # Cache tabhi initialise karo jab Redis/Postgres actually configured ho.
    # NOTE: permissions casbin se nahi, `Role`/`Permission` models se aati hain
    # (app/models/role.py) — guard `require_permission()` hai, dekho
    # app/api/deps.py.
    if not settings.DATABASE_URL.startswith("sqlite"):
        from app.core.cache import setup_cache

        setup_cache()

    log.info("startup", env=settings.APP_ENV, debug=settings.DEBUG)
    yield

    await engine.dispose()
    log.info("shutdown")


app = FastAPI(
    title=settings.PROJECT_NAME,
    debug=settings.DEBUG,
    lifespan=lifespan,
    # production mein interactive docs band — API internal hai
    docs_url=None if settings.APP_ENV == "production" else "/docs",
    redoc_url=None if settings.APP_ENV == "production" else "/redoc",
    openapi_url=None if settings.APP_ENV == "production" else "/openapi.json",
)

# Saara middleware ek jagah se — tarteeb ki wajah app/middleware/__init__.py mein likhi hai.
register_middleware(app)

# Serve uploaded files (see app/utils/files.py) at STATIC_URL_PREFIX.
Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
app.mount(
    settings.STATIC_URL_PREFIX,
    StaticFiles(directory=settings.UPLOAD_DIR),
    name="static",
)


# --------------------------------------------------------------------------- #
# exception handlers — har error ek hi envelope shakal mein
# --------------------------------------------------------------------------- #
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    """Domain exceptions ko standard error envelope mein badalta hai."""
    return error_response(exc.detail, status_code=exc.status_code)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Request/form validation errors — same envelope, field-wise list ke saath."""
    errors = [
        {
            "field": ".".join(str(part) for part in err["loc"]),
            "message": err["msg"],
            "type": err["type"],
        }
        for err in exc.errors()
    ]
    return error_response("Validation failed", status_code=422, errors=errors)


@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    """DB constraint toota — 500 nahi, sahi status code.

    Service pehle hi check karti hai (misal `sku_exists()`), magar do requests
    ek hi lamhe mein aayein to check dono pass kar jate hain aur race haarne
    wali yahan girti hai. Asal rakhwala DB ka constraint hai; ye handler usay
    theek jawab mein badalta hai.

    Raw DB message client ko **kabhi nahi** jata — usmein table/column ke naam
    hote hain. Wo sirf log mein.
    """
    detail = str(getattr(exc, "orig", exc))
    sqlstate = getattr(getattr(exc, "orig", None), "sqlstate", None)

    log.warning("db.integrity_error", path=request.url.path, sqlstate=sqlstate)

    # 23505 = unique_violation (PostgreSQL). SQLite par sqlstate nahi hota,
    # is liye message par fallback (tests SQLite par chalte hain).
    if sqlstate == "23505" or "UNIQUE constraint failed" in detail:
        return error_response("This record already exists", status_code=409)

    # baqi: foreign key / check / not-null — client ne ghalat data bheja
    return error_response("Request violates a database constraint", status_code=422)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Aakhri safety net — client ko kabhi stack trace na jaye."""
    log.exception("unhandled_error", path=request.url.path)
    return error_response("Internal server error", status_code=500)


# --------------------------------------------------------------------------- #
# health probes
# --------------------------------------------------------------------------- #
@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    """Liveness — process zinda hai. Koi dependency check nahi (fast rehna chahiye)."""
    return {"status": "ok"}


@app.get("/health/ready", tags=["health"])
async def readiness_check():
    """Readiness — DB tak pahunch hai ya nahi. Load balancer isay dekhta hai."""
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        log.exception("readiness.db_unavailable")
        return error_response("Database unavailable", status_code=503)
    return {"status": "ready"}


app.include_router(api_router, prefix=settings.API_V1_PREFIX)
