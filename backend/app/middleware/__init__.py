"""Middleware registration.

NOTE: TARTEEB AHAM HAI. Starlette middleware ko ULTA lagata hai — jo pehle add
hota hai wo sabse BAHAR hota hai (request pehle usme jati hai, response aakhir
mein usse nikalti hai).

Chahiye ye order (bahar se andar):

    1. RequestContext   -> request_id sabse pehle set ho, taake baaki sab log kar saken
    2. AccessLog        -> poora time measure kare, andar wale middleware sameet
    3. SecurityHeaders  -> har response par headers lagen, error responses par bhi
    4. BodySizeLimit    -> bada payload parse hone se pehle reject
    5. CORS             -> preflight jaldi nikal jaye (Next.js dev :3000 se aata hai)
    6. Tenant           -> JWT decode; iske baad hi routes chalte hain

Isliye `register_middleware()` inhe ULTE order mein add karta hai.

NOTE: `SessionMiddleware` yahan nahi hai. Ye backend pure JSON API hai — Next.js
aur Flutter dono `Authorization: Bearer <jwt>` bhejte hain, server-side session
cookie ki koi zaroorat nahi.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.core.config import settings
from app.middleware.logging import AccessLogMiddleware
from app.middleware.rate_limit import limiter
from app.middleware.request_context import RequestContextMiddleware, TenantMiddleware
from app.middleware.security_headers import BodySizeLimitMiddleware, SecurityHeadersMiddleware


def register_middleware(app: FastAPI) -> None:
    """Saara middleware sahi tarteeb mein lagata hai. `main.py` se ek baar call hota hai."""
    # slowapi decorators (`@limiter.limit`) ko `app.state.limiter` chahiye —
    # ye hamesha set hota hai, chahe rate limiting off ho.
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # --- ULTA order: aakhri add sabse ANDAR ---
    app.add_middleware(TenantMiddleware)

    # Global default limit (1000/min). Sirf tab jab Redis maujood ho.
    if settings.RATE_LIMIT_ENABLED:
        app.add_middleware(SlowAPIMiddleware)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )

    app.add_middleware(BodySizeLimitMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(AccessLogMiddleware)
    app.add_middleware(RequestContextMiddleware)  # sabse BAHAR


__all__ = ["register_middleware"]
