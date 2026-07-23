"""Mobile/terminal API: /api/v1/auth

Ek hi auth surface — Next.js web, Flutter mobile, POS terminal teeno isi ko
use karte hain. Farq sirf `audience` ka hai (web ka token chhoti muddat ka,
mobile ka lamba — dekho `core/config.py`).
"""

from fastapi import APIRouter, Request, Response

from app.api.deps import AuthServiceDep, CurrentUserDep
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

# Web se aane wale requests ke liye default. Flutter app `?audience=mobile`
# bhej sakti hai.
DEFAULT_AUDIENCE: TokenAudience = "web"


@router.post("/register", response_model=ApiResponse[TokenResponse], status_code=201)
async def register(payload: RegisterRequest, service: AuthServiceDep) -> Response:
    """Naya business + uska owner user banata hai, aur token wapas deta hai."""
    _user, access, refresh = await service.register(
        business_name=payload.business_name,
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name,
        audience=DEFAULT_AUDIENCE,
    )
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
    _user, access, refresh = await service.login(
        email=payload.email, password=payload.password, audience=DEFAULT_AUDIENCE
    )
    return ok(
        TokenResponse(access_token=access, refresh_token=refresh),
        message="Logged in",
    )


@router.post("/refresh", response_model=ApiResponse[TokenResponse])
async def refresh(payload: RefreshRequest, service: AuthServiceDep) -> Response:
    access, refresh_token = await service.refresh(
        payload.refresh_token, audience=DEFAULT_AUDIENCE
    )
    return ok(TokenResponse(access_token=access, refresh_token=refresh_token))


@router.get("/me", response_model=ApiResponse[MeResponse])
async def me(user: CurrentUserDep) -> Response:
    """Logged-in user + uske rishtay (business, role) aur permissions."""
    body = MeResponse.model_validate(user)
    body.permissions = (
        [p.name for p in user.role.permissions] if user.role is not None else []
    )
    return ok(body)
