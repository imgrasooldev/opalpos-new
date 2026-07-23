"""Mobile/terminal API: /api/v1/auth

Ek hi auth surface — Next.js web, Flutter mobile, POS terminal teeno isi ko
use karte hain. Farq sirf `audience` ka hai (web ka token chhoti muddat ka,
mobile ka lamba — dekho `core/config.py`).

Error handling ka dhaancha `endpoints/products.py` ke docstring mein samjhaya
gaya hai (reference slice). Yahan ek extra pabandi hai:

    log mein password, access token ya refresh token KABHI nahi jate.

Ghalat password ya expired token `UnauthorizedError` hai — yani
`HANDLED_ERRORS` — is liye wo `except Exception` tak pahunchta hi nahi.
"""

from fastapi import APIRouter, Request, Response

from app.api.deps import AuthServiceDep, CurrentUserDep
from app.core.exceptions import HANDLED_ERRORS
from app.core.logging import get_logger
from app.core.security import TokenAudience
from app.middleware.rate_limit import LOGIN_LIMIT, limiter
from app.schemas.auth import (
    LoginRequest,
    MeResponse,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
)
from app.utils.response import ApiResponse, created, ok

router = APIRouter(prefix="/auth", tags=["auth"])
log = get_logger("api.auth")

# Web se aane wale requests ke liye default. Flutter app `?audience=mobile`
# bhej sakti hai.
DEFAULT_AUDIENCE: TokenAudience = "web"


@router.post("/register", response_model=ApiResponse[TokenResponse], status_code=201)
async def register(payload: RegisterRequest, service: AuthServiceDep) -> Response:
    """Naya business + uska owner user banata hai, aur token wapas deta hai."""
    try:
        _user, access, refresh = await service.register(
            business_name=payload.business_name,
            email=payload.email,
            password=payload.password,
            full_name=payload.full_name,
            audience=DEFAULT_AUDIENCE,
        )
    except HANDLED_ERRORS:
        # email pehle se registered -> ConflictError (409)
        raise
    except Exception:
        log.exception(
            "auth.register.failed",
            email=payload.email,
            business_name=payload.business_name,
        )
        raise

    return created(
        TokenResponse(access_token=access, refresh_token=refresh),
        message="Business registered",
    )


@router.post("/login", response_model=ApiResponse[TokenResponse])
@limiter.limit(LOGIN_LIMIT)
async def login(
    request: Request,  # slowapi ko chahiye — key isi se banti hai
    payload: LoginRequest,
    service: AuthServiceDep,
) -> Response:
    try:
        _user, access, refresh = await service.login(
            email=payload.email, password=payload.password, audience=DEFAULT_AUDIENCE
        )
    except HANDLED_ERRORS:
        # ghalat email/password -> UnauthorizedError (401). Ye rozmarra ki baat
        # hai, error-level log nahi banni chahiye.
        raise
    except Exception:
        log.exception("auth.login.failed", email=payload.email)
        raise

    return ok(
        TokenResponse(access_token=access, refresh_token=refresh),
        message="Logged in",
    )


@router.post("/refresh", response_model=ApiResponse[TokenResponse])
async def refresh(payload: RefreshRequest, service: AuthServiceDep) -> Response:
    try:
        access, refresh_token = await service.refresh(
            payload.refresh_token, audience=DEFAULT_AUDIENCE
        )
    except HANDLED_ERRORS:
        raise
    except Exception:
        # token log mein nahi — wo bearer credential hai
        log.exception("auth.refresh.failed")
        raise

    return ok(TokenResponse(access_token=access, refresh_token=refresh_token))


@router.get("/me", response_model=ApiResponse[MeResponse])
async def me(user: CurrentUserDep) -> Response:
    """Logged-in user + uske rishtay (business, role) aur permissions."""
    try:
        body = MeResponse.model_validate(user)
        body.permissions = (
            [p.name for p in user.role.permissions] if user.role is not None else []
        )
    except HANDLED_ERRORS:
        raise
    except Exception:
        log.exception("auth.me.failed", user_id=user.id)
        raise

    return ok(body)
