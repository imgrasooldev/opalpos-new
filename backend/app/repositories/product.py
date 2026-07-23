"""product repository — REFERENCE SLICE.

Naya tenant-scoped repository isi shakal mein banao. Yahan sirf teen cheezein
hain aur bas:

    model     -> kaunsa model
    scopes    -> ek shart = ek chhota function (Laravel ke `scopeXxx()` jaisa)
    filtered()-> un scopes ko jorh kar ek builder

Tenant filter (`business_id`) aur soft-delete filter yahan likhe hi nahi —
wo `TenantRepository` ke global scopes se khud lagte hain.

RELATIONSHIP SE QUERY (is file ka asal sabaq):

Jab shart doosri table par ho to `join` haath se mat likho — model par jo
rishta bana hua hai (dekho `app/models/product.py`) wahi use karo:

    MANY-TO-ONE   Product.category / .brand / .unit   ->  `.has(shart)`
    ONE-TO-MANY   Product.variations                  ->  `.any(shart)`

Dono correlated `EXISTS (...)` banate hain, JOIN nahi. Do faide:

  1. Ek product kabhi do baar nahi aata, is liye `count` sahi rehta hai
     (JOIN karte to `DISTINCT` lagana parta).
  2. Shart *related row* par lagti hai — is liye soft-deleted category/brand/
     variation ko wahin filter kiya ja sakta hai. `Product.category_id == x`
     se ye mumkin nahi tha.

PostgreSQL case-SENSITIVE hai (MySQL nahi tha), is liye naam/SKU search mein
`ILIKE` — `LIKE` nahi.
"""

from sqlalchemy import and_, or_

from app.models.product import Brand, Category, Product, ProductVariation
from app.repositories.base import TenantRepository
from app.repositories.query import Criterion, QueryBuilder


class ProductRepository(TenantRepository[Product]):
    model = Product

    # ------------------------------------------------------------------ #
    # scopes — har ek akela, test karne mein aasan
    # ------------------------------------------------------------------ #
    @staticmethod
    def matches(term: str) -> Criterion:
        """Naam, SKU, sub-SKU, category ya brand ke naam — kisi ek mein bhi mile.

        sub-SKU is liye ke barcode scanner aksar wahi bhejta hai, product ka
        SKU nahi.
        """
        pattern = f"%{term}%"
        return or_(
            Product.name.ilike(pattern),
            Product.sku.ilike(pattern),
            # ONE-TO-MANY -> .any(): "koi ek variation aisi ho"
            Product.variations.any(
                and_(
                    ProductVariation.sub_sku.ilike(pattern),
                    ProductVariation.deleted_at.is_(None),
                )
            ),
            # MANY-TO-ONE -> .has(): "iski category/brand aisi ho"
            Product.category.has(
                and_(Category.name.ilike(pattern), Category.deleted_at.is_(None))
            ),
            Product.brand.has(
                and_(Brand.name.ilike(pattern), Brand.deleted_at.is_(None))
            ),
        )

    @staticmethod
    def in_category(category_id: int) -> Criterion:
        """`Product.category_id == x` se thora mehnga, magar soft-deleted
        category wale products yahin bahar ho jate hain."""
        return Product.category.has(
            and_(Category.id == category_id, Category.deleted_at.is_(None))
        )

    @staticmethod
    def of_brand(brand_id: int) -> Criterion:
        return Product.brand.has(
            and_(Brand.id == brand_id, Brand.deleted_at.is_(None))
        )

    # ------------------------------------------------------------------ #
    # reads
    # ------------------------------------------------------------------ #
    def filtered(
        self,
        *,
        q: str | None = None,
        category_id: int | None = None,
        brand_id: int | None = None,
        only_active: bool = False,
    ) -> QueryBuilder[Product]:
        """List aur count DONO yehi builder use karte hain — is liye pagination
        ka `total` kabhi rows se mismatch nahi karta."""
        return (
            self.query()
            .when(q, self.matches)
            .when(category_id, self.in_category)
            .when(brand_id, self.of_brand)
            .when(only_active, lambda _: Product.is_inactive.is_(False))
            .order_by(Product.name)
        )

    async def paginate(
        self, *, skip: int = 0, limit: int = 20, **filters: object
    ) -> tuple[list[Product], int]:
        return await self.filtered(**filters).paginate(skip=skip, limit=limit)  # type: ignore[arg-type]

    async def sku_exists(self, sku: str, *, exclude_id: int | None = None) -> bool:
        """SKU uniqueness sirf isi business ke andar — global scope se."""
        return await (
            self.query()
            .where(Product.sku == sku)
            .when(exclude_id, lambda v: Product.id != v)
            .exists()
        )

    async def max_sku_number(self, prefix: str) -> int:
        """Is business mein `<prefix>NNNN` ka sabse bara NNNN — naya SKU isse +1.

        `pluck` sirf sku column laata hai, poore Product objects hydrate nahi
        karta. Number-parsing Python mein hai taake SQLite aur Postgres dono
        par ek jaisa chale (PG-only regex cast se bachne ke liye).
        """
        skus = await self.query().where(Product.sku.startswith(prefix)).pluck(Product.sku)

        highest = 0
        for sku in skus:
            tail = sku[len(prefix) :]
            if tail.isdigit():
                highest = max(highest, int(tail))
        return highest
