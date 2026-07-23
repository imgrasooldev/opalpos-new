"""Request ID + tenant context middleware.

Har request ko ek `X-Request-ID` deta hai (client bhej de to wahi use hota hai)
aur JWT se user/business context set karta hai taake services ko har jagah
`business_id` parameter pass na karna pade.
"""

import uuid

import jwt
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.core import tenancy
from app.core.config import settings

REQUEST_ID_HEADER = "X-Request-ID"


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Request id set karta hai aur response header mein wapas bhejta hai."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        rid = request.headers.get(REQUEST_ID_HEADER) or uuid.uuid4().hex
        tenancy.set_request_id(rid)
        request.state.request_id = rid
        try:
            response = await call_next(request)
        finally:
            tenancy.reset()
        response.headers[REQUEST_ID_HEADER] = rid
        return response


class TenantMiddleware(BaseHTTPMiddleware):
    """JWT se user_id + business_id nikaal kar context mein daalta hai.

    Yahan auth *enforce* nahi hota — wo endpoint dependency ka kaam hai. Ye sirf
    context populate karta hai, taake logging aur tenant-scoped queries ko
    business_id mil jaye. Invalid token chup-chaap ignore hota hai; protected
    endpoint uske baad khud 401 dega.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth.removeprefix("Bearer ").strip()
            for audience in ("mobile", "web"):
                try:
                    payload = jwt.decode(
                        token,
                        settings.SECRET_KEY,
                        algorithms=[settings.JWT_ALGORITHM],
                        audience=audience,
                    )
                except jwt.PyJWTError:
                    continue
                sub = payload.get("sub")
                tenancy.set_actor(
                    user_id=int(sub) if sub is not None else None,
                    business_id=payload.get("bid"),
                    location_id=payload.get("lid"),
                )
                request.state.token_payload = payload
                break
        return await call_next(request)
