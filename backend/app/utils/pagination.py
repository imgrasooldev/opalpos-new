"""Reusable pagination helpers.

``PageParams`` endpoint dependency hai aur ``paginated()` jawab banata hai —
har list endpoint bilkul ek jaisa paginate karta hai:

    @router.get("")
    async def list_users(params: PageParamsDep, service: UserServiceDep):
        users, total = await service.paginate_users(
            skip=params.offset, limit=params.size
        )
        items = [UserRead.model_validate(u) for u in users]
        return paginated(items, total=total, params=params)
"""

from math import ceil
from typing import Annotated, Any, Generic, TypeVar

from fastapi import Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.utils.response import ok

T = TypeVar("T")


class PageParams(BaseModel):
    page: int = 1
    size: int = 20

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.size


def get_page_params(
    page: int = Query(1, ge=1, description="1-based page number"),
    size: int = Query(20, ge=1, le=100, description="items per page"),
) -> PageParams:
    return PageParams(page=page, size=size)


PageParamsDep = Annotated[PageParams, Depends(get_page_params)]


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    size: int
    pages: int

    @classmethod
    def create(cls, items: list[T], *, total: int, params: PageParams) -> "Page[T]":
        return cls(
            items=items,
            total=total,
            page=params.page,
            size=params.size,
            pages=ceil(total / params.size) if params.size else 0,
        )


def paginated(
    items: list[Any], *, total: int, params: PageParams
) -> JSONResponse:
    """List endpoint ka standard jawab: `data` = rows, `meta` = pagination.

    Ye teen lines har list endpoint mein copy hoti thin — ab ek jagah hain.
    """
    page = Page.create(items, total=total, params=params)
    return ok(items, meta=page.model_dump(exclude={"items"}))
