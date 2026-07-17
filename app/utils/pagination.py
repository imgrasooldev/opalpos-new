"""Reusable pagination helpers.

Use ``PageParams`` as an endpoint dependency and ``Page`` as the response
model so every list endpoint paginates the same way.

Example:

    @router.get("", response_model=Page[UserRead])
    async def list_users(params: PageParamsDep, service: UserServiceDep):
        items = await service.list_users(skip=params.offset, limit=params.size)
        total = await service.count_users()
        return Page.create(items, total=total, params=params)
"""

from math import ceil
from typing import Annotated, Generic, TypeVar

from fastapi import Depends, Query
from pydantic import BaseModel

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
