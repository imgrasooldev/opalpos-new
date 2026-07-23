"""product repository — BaseRepository se inherit karo.

REFERENCE SLICE — tenant-scoped repository ka tareeqa.

KHATRA: `BaseRepository.get()` / `.list()` / `.count()` generic hain — wo
`business_id` filter NAHI lagate. Tenant-scoped table par unhe seedha mat use
karo, warna ek business ka data doosre ko chala jayega. Isi liye yahan
`get_scoped()` / `search()` / `count_search()` diye gaye hain — hamesha yehi
use karo.

Doosri baat: PostgreSQL case-SENSITIVE hai (MySQL nahi tha), isliye naam/SKU
search mein `ILIKE` use hota hai, `LIKE` nahi.
"""

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import ColumnElement, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.tenancy import current_business_id
from app.models.product import Product
from app.repositories.base import BaseRepository


class ProductRepository(BaseRepository[Product]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Product, session)

    # ----------------------------------------------------------------- #
    # filters — list aur count dono yehi conditions use karte hain, taake
    # pagination ka total kabhi rows se mismatch na ho
    # ----------------------------------------------------------------- #
    def _conditions(
        self,
        *,
        q: str | None = None,
        category_id: int | None = None,
        brand_id: int | None = None,
        only_active: bool = False,
    ) -> list[ColumnElement[bool]]:
        conditions: list[ColumnElement[bool]] = [
            # ye do lines har tenant-scoped query mein honi chahiye
            Product.business_id == current_business_id(),
            Product.deleted_at.is_(None),
        ]
        if q:
            pattern = f"%{q}%"
            conditions.append(
                or_(Product.name.ilike(pattern), Product.sku.ilike(pattern))
            )
        if category_id is not None:
            conditions.append(Product.category_id == category_id)
        if brand_id is not None:
            conditions.append(Product.brand_id == brand_id)
        if only_active:
            conditions.append(Product.is_inactive.is_(False))
        return conditions

    # ----------------------------------------------------------------- #
    # reads
    # ----------------------------------------------------------------- #
    async def get_scoped(self, product_id: int) -> Product | None:
        """`get()` ki jagah hamesha ye — ye business scope check karta hai."""
        stmt = select(Product).where(
            Product.id == product_id, *self._conditions()
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def search(
        self, *, skip: int = 0, limit: int = 20, **filters: Any
    ) -> list[Product]:
        stmt = (
            select(Product)
            .where(*self._conditions(**filters))
            .order_by(Product.name)
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_search(self, **filters: Any) -> int:
        stmt = (
            select(func.count())
            .select_from(Product)
            .where(*self._conditions(**filters))
        )
        result = await self.session.execute(stmt)
        return int(result.scalar_one())

    async def sku_exists(self, sku: str, *, exclude_id: int | None = None) -> bool:
        """SKU uniqueness sirf isi business ke andar check hoti hai."""
        stmt = select(Product.id).where(Product.sku == sku, *self._conditions())
        if exclude_id is not None:
            stmt = stmt.where(Product.id != exclude_id)
        result = await self.session.execute(stmt.limit(1))
        return result.scalar_one_or_none() is not None

    async def max_sku_number(self, prefix: str) -> int:
        """Is business mein `<prefix>NNNN` ka sabse bada NNNN — SKU auto-generate
        ke liye. Naya SKU isse +1 hota hai."""
        stmt = select(Product.sku).where(
            Product.sku.like(f"{prefix}%"), *self._conditions()
        )
        result = await self.session.execute(stmt)
        highest = 0
        for (sku,) in result.all():
            tail = sku[len(prefix) :]
            if tail.isdigit():
                highest = max(highest, int(tail))
        return highest

    # ----------------------------------------------------------------- #
    # writes
    # ----------------------------------------------------------------- #
    async def soft_delete(self, product: Product) -> None:
        """Row uda-te nahi — `deleted_at` set karte hain (Laravel SoftDeletes)."""
        await self.update(product, {"deleted_at": datetime.now(UTC)})
