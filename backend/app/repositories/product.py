"""product repository — REFERENCE SLICE.

Naya tenant-scoped repository isi shakal mein banao:

  * `_conditions()` -> har read ki shared WHERE list. Pehli do lines HAMESHA
    tenant-scope hain (business_id + soft delete). `list()` aur `count()` dono
    yehi list use karte hain, is liye pagination ka total kabhi rows se
    mismatch nahi karta.
  * baaki reads seedhi SQLAlchemy `select()` hain — koi custom builder nahi.

RELATION SE FILTER (is file ka asal sabaq):

Jab shart doosri table par ho to `join` haath se mat likho — model par jo
rishta bana hua hai (dekho `app/models/product.py`) wahi use karo:

    MANY-TO-ONE   Product.category / .brand   ->  `.has(shart)`
    ONE-TO-MANY   Product.variations          ->  `.any(shart)`

Dono correlated `EXISTS (...)` banate hain, JOIN nahi. Faida: row duplicate
nahi hoti (count sahi rehta hai), aur shart *related row* par lagti hai — is
liye soft-deleted category/brand/variation wahin filter ho jate hain, jo
`Product.category_id == x` se mumkin nahi tha.

PostgreSQL case-SENSITIVE hai (MySQL nahi tha), is liye naam/SKU search mein
`ILIKE` — `LIKE` nahi.
"""

from sqlalchemy import ColumnElement, and_, func, or_, select

from app.core.tenancy import current_business_id
from app.models.product import Brand, Category, Product, ProductVariation
from app.repositories.base import BaseRepository


class ProductRepository(BaseRepository[Product]):
    model = Product

    def _conditions(
        self,
        *,
        q: str | None = None,
        category_id: int | None = None,
        brand_id: int | None = None,
        only_active: bool = False,
    ) -> list[ColumnElement[bool]]:
        conditions: list[ColumnElement[bool]] = [
            # ye do lines har read par lagti hain — tenant scope
            Product.business_id == current_business_id(),
            Product.deleted_at.is_(None),
        ]
        if q:
            pattern = f"%{q}%"
            conditions.append(
                or_(
                    Product.name.ilike(pattern),
                    Product.sku.ilike(pattern),
                    # ONE-TO-MANY -> .any(): sub-SKU se (barcode scanner wahi bhejta hai)
                    Product.variations.any(
                        and_(
                            ProductVariation.sub_sku.ilike(pattern),
                            ProductVariation.deleted_at.is_(None),
                        )
                    ),
                    # MANY-TO-ONE -> .has(): category/brand ke naam se
                    Product.category.has(
                        and_(Category.name.ilike(pattern), Category.deleted_at.is_(None))
                    ),
                    Product.brand.has(
                        and_(Brand.name.ilike(pattern), Brand.deleted_at.is_(None))
                    ),
                )
            )
        if category_id is not None:
            conditions.append(
                Product.category.has(
                    and_(Category.id == category_id, Category.deleted_at.is_(None))
                )
            )
        if brand_id is not None:
            conditions.append(
                Product.brand.has(
                    and_(Brand.id == brand_id, Brand.deleted_at.is_(None))
                )
            )
        if only_active:
            conditions.append(Product.is_inactive.is_(False))
        return conditions

    async def get(self, product_id: int) -> Product | None:
        """Scoped — doosre business ka product `None` aata hai."""
        stmt = select(Product).where(Product.id == product_id, *self._conditions())
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list(
        self, *, skip: int = 0, limit: int = 20, **filters: object
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

    async def count(self, **filters: object) -> int:
        stmt = select(func.count()).select_from(Product).where(
            *self._conditions(**filters)
        )
        result = await self.session.execute(stmt)
        return int(result.scalar_one())

    async def sku_exists(self, sku: str, *, exclude_id: int | None = None) -> bool:
        """SKU uniqueness sirf isi business ke andar."""
        stmt = select(Product.id).where(Product.sku == sku, *self._conditions())
        if exclude_id is not None:
            stmt = stmt.where(Product.id != exclude_id)
        result = await self.session.execute(stmt.limit(1))
        return result.scalar_one_or_none() is not None

    async def max_sku_number(self, prefix: str) -> int:
        """Is business mein `<prefix>NNNN` ka sabse bara NNNN — naya SKU isse +1."""
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
