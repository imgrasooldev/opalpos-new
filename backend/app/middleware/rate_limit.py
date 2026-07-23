"""Rate limiting — slowapi (Laravel `throttle` middleware ka replacement).

Redis backend istemal hota hai taake multiple uvicorn workers ke beech counters
share hon; in-memory par har worker ka apna counter hota aur limit N-guna ho
jati.

Key user_id se banti hai (agar authenticated ho), warna IP se — POS terminals
aksar ek hi NAT IP ke peeche hote hain, to sirf IP par limit lagana ek hi shop
ke saare cashiers ko block kar deta.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

from app.core import tenancy
from app.core.config import settings


def rate_limit_key(request: Request) -> str:
    user_id = tenancy.user_id_optional()
    if user_id is not None:
        return f"user:{user_id}"
    return f"ip:{get_remote_address(request)}"


limiter = Limiter(
    key_func=rate_limit_key,
    storage_uri=str(settings.REDIS_URL),
    default_limits=["1000/minute"],
    headers_enabled=True,
    # `enabled=False` par saare `@limiter.limit(...)` decorators no-op ho jate
    # hain — isi liye bina Redis ke local dev bhi chalta hai.
    enabled=settings.RATE_LIMIT_ENABLED,
)

# Endpoint-specific limits — decorator ki tarah lagao:
#   @router.post("/login")
#   @limiter.limit(LOGIN_LIMIT)
#   async def login(request: Request, ...): ...
LOGIN_LIMIT = "10/minute"        # brute force
OTP_LIMIT = "5/minute"           # SMS cost
SYNC_LIMIT = "60/minute"         # mobile offline sync
REPORT_LIMIT = "30/minute"       # bhaari queries
