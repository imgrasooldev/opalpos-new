"""Standardized API response envelope + status-code helpers.

Every endpoint returns the same JSON shape, so clients always parse it the same
way:

    success:  { "success": true,  "message": "...", "data": {...}, "meta": {...} }
    error:    { "success": false, "message": "...", "errors": [...] }

Use the helpers below instead of hand-writing status codes or envelope keys:

    return ok(user)                       # 200
    return created(user, message="...")   # 201
    return no_content()                   # 204
    return error_response("Bad", status_code=400)

`ApiResponse[T]` is provided as a `response_model` so the OpenAPI docs still
show the real payload schema.
"""

from typing import Any, Generic, Optional, TypeVar

from fastapi import status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """Success envelope — use as `response_model=ApiResponse[UserRead]`."""

    success: bool = True
    message: Optional[str] = None
    data: Optional[T] = None
    meta: Optional[dict[str, Any]] = None


def success_response(
    data: Any = None,
    *,
    message: str | None = None,
    status_code: int = status.HTTP_200_OK,
    meta: dict[str, Any] | None = None,
) -> JSONResponse:
    """Build a success envelope with an explicit status code."""
    content = {
        "success": True,
        "message": message,
        "data": jsonable_encoder(data),
        "meta": meta,
    }
    return JSONResponse(status_code=status_code, content=content)


def ok(data: Any = None, *, message: str | None = None, meta=None) -> JSONResponse:
    """200 OK."""
    return success_response(
        data, message=message, status_code=status.HTTP_200_OK, meta=meta
    )


def created(data: Any = None, *, message: str | None = None, meta=None) -> JSONResponse:
    """201 Created."""
    return success_response(
        data, message=message, status_code=status.HTTP_201_CREATED, meta=meta
    )


def accepted(data: Any = None, *, message: str | None = None, meta=None) -> JSONResponse:
    """202 Accepted."""
    return success_response(
        data, message=message, status_code=status.HTTP_202_ACCEPTED, meta=meta
    )


def no_content() -> Response:
    """204 No Content (empty body)."""
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def error_response(
    message: str,
    *,
    status_code: int = status.HTTP_400_BAD_REQUEST,
    errors: Any = None,
) -> JSONResponse:
    """Build an error envelope."""
    content = {
        "success": False,
        "message": message,
        "errors": jsonable_encoder(errors) if errors is not None else None,
    }
    return JSONResponse(status_code=status_code, content=content)
