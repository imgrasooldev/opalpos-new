"""Structured access logging + slow-request warning.

Har request ka ek JSON log line — request_id, user, business, duration ke saath.
POS terminals bahut saari chhoti requests bhejte hain, isliye health checks ko
skip karte hain warna logs bhar jate hain.
"""

import time

import structlog
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.core import tenancy

log = structlog.get_logger("access")

SKIP_PATHS = frozenset({"/health", "/metrics", "/favicon.ico"})
SLOW_REQUEST_MS = 1000


class AccessLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if request.url.path in SKIP_PATHS:
            return await call_next(request)

        started = time.perf_counter()
        status_code = 500
        try:
            response = await call_next(request)
            status_code = response.status_code
            return response
        finally:
            duration_ms = round((time.perf_counter() - started) * 1000, 2)
            event = "request.slow" if duration_ms >= SLOW_REQUEST_MS else "request"
            logger = log.warning if duration_ms >= SLOW_REQUEST_MS else log.info
            logger(
                event,
                method=request.method,
                path=request.url.path,
                status=status_code,
                duration_ms=duration_ms,
                request_id=tenancy.request_id(),
                user_id=tenancy.user_id_optional(),
                business_id=tenancy.business_id_optional(),
                client=request.client.host if request.client else None,
            )
