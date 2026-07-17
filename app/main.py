from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import init_db
from app.core.exceptions import AppException
from app.utils.response import error_response


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables for dev convenience. Use Alembic in production.
    await init_db()
    yield
    # Shutdown hooks (close clients, etc.) would go here.


app = FastAPI(
    title=settings.PROJECT_NAME,
    debug=settings.DEBUG,
    lifespan=lifespan,
)

# Serve uploaded files (see app/utils/files.py) at STATIC_URL_PREFIX.
Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
app.mount(
    settings.STATIC_URL_PREFIX,
    StaticFiles(directory=settings.UPLOAD_DIR),
    name="static",
)


@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    """Translate domain exceptions into the standard error envelope."""
    return error_response(exc.detail, status_code=exc.status_code)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Render request/form validation errors in the standard error envelope."""
    errors = [
        {
            "field": ".".join(str(part) for part in err["loc"]),
            "message": err["msg"],
            "type": err["type"],
        }
        for err in exc.errors()
    ]
    return error_response("Validation failed", status_code=422, errors=errors)


@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(api_router, prefix=settings.API_V1_PREFIX)
