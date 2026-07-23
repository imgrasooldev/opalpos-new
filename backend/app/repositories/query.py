"""Chainable query builder — Laravel ke Eloquent builder ka barabar.

Laravel mein aap likhte ho:

    Product::query()->search($q)->ofCategory($id)->active()->paginate(20);

Yahan wahi shakal:

    await (
        repo.query()
        .when(q, lambda v: Product.name.ilike(f"%{v}%"))
        .when(category_id, lambda v: Product.category.has(Category.id == v))
        .order_by(Product.name)
        .paginate(skip=0, limit=20)
    )

DO AHEM BAATEIN:

1. Builder **immutable** hai — har method naya builder wapas karta hai. Is liye
   ek `base` builder bana kar usay do jagah (list + count) use karna mehfooz hai.

2. `list` aur `count` HAMESHA ek hi `where` conditions se bante hain (dekho
   `_select()` / `_count()`), is liye pagination ka `total` kabhi rows se
   mismatch nahi karta. Pehle ye baat comment mein likhi hoti thi aur haath se
   nibhani parti thi — ab structure khud sambhalta hai.

3. Related table par shart lagani ho to JOIN mat likho — model ka rishta use
   karo (`.has()` many-to-one, `.any()` one-to-many). Wo `EXISTS (...)` banta
   hai, is liye rows duplicate nahi hoti aur `count` sahi rehta hai.
"""

from collections.abc import Callable, Sequence
from typing import Any, Generic, Self, TypeVar

from sqlalchemy import ColumnElement, Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.orm.attributes import InstrumentedAttribute

from app.core.database import Base

ModelType = TypeVar("ModelType", bound=Base)

# `when()` ka doosra argument: value le kar SQL shart banata hai
Criterion = ColumnElement[bool]
CriterionFactory = Callable[[Any], Criterion]


class QueryBuilder(Generic[ModelType]):
    """Ek model par immutable, chainable query."""

    __slots__ = ("_model", "_session", "_wheres", "_options", "_orders")

    def __init__(
        self,
        model: type[ModelType],
        session: AsyncSession,
        *,
        wheres: tuple[Criterion, ...] = (),
        options: tuple[Any, ...] = (),
        orders: tuple[Any, ...] = (),
    ) -> None:
        self._model = model
        self._session = session
        self._wheres = wheres
        self._options = options
        self._orders = orders

    def _with(self, **changes: Any) -> Self:
        """Naya builder — purane ko kabhi mutate nahi karte."""
        return type(self)(
            self._model,
            self._session,
            wheres=changes.get("wheres", self._wheres),
            options=changes.get("options", self._options),
            orders=changes.get("orders", self._orders),
        )

    # ------------------------------------------------------------------ #
    # chainable
    # ------------------------------------------------------------------ #
    def where(self, *criteria: Criterion) -> Self:
        return self._with(wheres=self._wheres + criteria)

    def when(self, value: Any, criterion: CriterionFactory) -> Self:
        """Laravel ka `->when()` — filter tabhi lagta hai jab value di gayi ho.

        Isi se repository se `if` ki seedhi lagi hui deewar khatam hoti hai::

            .when(q, lambda v: Product.name.ilike(f"%{v}%"))

        `None`, `False`, `""` par shart lagti hi nahi (aur `criterion` call
        bhi nahi hota).
        """
        if not value:
            return self
        return self.where(criterion(value))

    def with_(self, *relations: InstrumentedAttribute[Any]) -> Self:
        """Laravel ka `->with('variations')` — eager load, N+1 se bachne ko.

        NOTE: `Product.variations` / `.category` / `.brand` / `.unit` par model
        mein pehle hi `lazy="selectin"` laga hai, is liye unke liye ye likhna
        zaroori nahi. Ye un rishton ke liye hai jo by-default lazy hain.
        """
        loaders = tuple(selectinload(rel) for rel in relations)
        return self._with(options=self._options + loaders)

    def order_by(self, *columns: Any) -> Self:
        return self._with(orders=self._orders + columns)

    # ------------------------------------------------------------------ #
    # statements — list aur count ek hi `_wheres` se bante hain
    # ------------------------------------------------------------------ #
    def _select(self) -> Select[tuple[ModelType]]:
        return (
            select(self._model)
            .where(*self._wheres)
            .options(*self._options)
            .order_by(*self._orders)
        )

    def _count(self) -> Select[tuple[int]]:
        return select(func.count()).select_from(self._model).where(*self._wheres)

    # ------------------------------------------------------------------ #
    # terminal — yahan query DB par jati hai
    # ------------------------------------------------------------------ #
    async def first(self) -> ModelType | None:
        result = await self._session.execute(self._select().limit(1))
        return result.scalars().first()

    async def get(self, *, skip: int = 0, limit: int | None = None) -> list[ModelType]:
        stmt = self._select()
        if skip:
            stmt = stmt.offset(skip)
        if limit is not None:
            stmt = stmt.limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def count(self) -> int:
        result = await self._session.execute(self._count())
        return int(result.scalar_one())

    async def exists(self) -> bool:
        result = await self._session.execute(
            select(self._model.id).where(*self._wheres).limit(1)  # type: ignore[attr-defined]
        )
        return result.scalar_one_or_none() is not None

    async def paginate(
        self, *, skip: int = 0, limit: int = 20
    ) -> tuple[list[ModelType], int]:
        """`(rows, total)` — dono ek hi builder se, is liye hamesha match karte hain."""
        return await self.get(skip=skip, limit=limit), await self.count()

    async def pluck(self, column: InstrumentedAttribute[Any]) -> Sequence[Any]:
        """Laravel ka `->pluck('sku')` — poore objects hydrate kiye baghair ek column."""
        result = await self._session.execute(
            select(column).where(*self._wheres).order_by(*self._orders)
        )
        return result.scalars().all()
