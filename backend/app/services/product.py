"""ProductUtil.php -> single/variable/combo, SKU, pricing.

REFERENCE SLICE — service layer ka tareeqa.

Qaida:
  - Business rules SIRF yahan. Endpoint mein `if` nahi likhna.
  - HTTP ka zikr yahan nahi (no Request/Response/status codes) — sirf domain
    exceptions raise karo (`app/core/exceptions.py`), unhe HTTP mein badalna
    `app/main.py` ka kaam hai.
  - DB seedha touch nahi — sab kuch repository ke through.
  - `business_id` / `created_by` khud set karo (tenancy context se), client par
    bharosa mat karo — warna koi doosre business mein row bana dega.
"""

from app.core.exceptions import ConflictError, NotFoundError
from app.core.tenancy import current_business_id, current_user_id
from app.models.product import Product, ProductVariation
from app.repositories.product import ProductRepository
from app.schemas.product import ProductCreate, ProductUpdate, VariationCreate

DEFAULT_SKU_PREFIX = "SKU"
SKU_NUMBER_WIDTH = 4


class ProductService:
    def __init__(self, repository: ProductRepository) -> None:
        self.repository = repository

    # ----------------------------------------------------------------- #
    # reads
    # ----------------------------------------------------------------- #
    async def get_product(self, product_id: int) -> Product:
        product = await self.repository.find(product_id)
        if product is None:
            # scope se bahar ka product bhi "not found" hai — 403 mat do,
            # warna attacker ko pata chal jayega ke wo id exist karti hai
            raise NotFoundError(f"Product {product_id} not found")
        return product

    async def paginate_products(
        self, *, skip: int = 0, limit: int = 20, **filters
    ) -> tuple[list[Product], int]:
        """`(rows, total)` — ek hi call, dono ek hi filters se. Pehle ye do
        alag methods thin aur endpoint ko filters do baar bhejne parte the."""
        return await self.repository.paginate(skip=skip, limit=limit, **filters)

    # ----------------------------------------------------------------- #
    # writes
    # ----------------------------------------------------------------- #
    async def create_product(self, data: ProductCreate) -> Product:
        sku = data.sku.strip() if data.sku else await self._generate_sku()

        if await self.repository.sku_exists(sku):
            raise ConflictError(f"SKU '{sku}' already exists in this business")

        product = Product(
            # tenancy context se — request body se NAHI
            business_id=current_business_id(),
            created_by=current_user_id(),
            name=data.name,
            type=data.type,
            sku=sku,
            unit_id=data.unit_id,
            category_id=data.category_id,
            brand_id=data.brand_id,
            enable_stock=data.enable_stock,
            alert_quantity=data.alert_quantity,
            description=data.description,
            is_inactive=data.is_inactive,
        )
        # relationship se — product_id haath se set nahi karte, cascade
        # (`all, delete-orphan`) dono ko ek hi flush mein save kar deta hai
        product.variations = [
            self._build_variation(v, sku=sku, index=i)
            for i, v in enumerate(data.variations, start=1)
        ]
        return await self.repository.create(product)

    async def update_product(self, product_id: int, data: ProductUpdate) -> Product:
        product = await self.get_product(product_id)

        # exclude_unset -> sirf wahi fields jo client ne bheje
        payload = data.model_dump(exclude_unset=True)
        payload["updated_by"] = current_user_id()

        return await self.repository.update(product, payload)

    async def delete_product(self, product_id: int) -> None:
        product = await self.get_product(product_id)
        await self.repository.soft_delete(product)

    # ----------------------------------------------------------------- #
    # helpers
    # ----------------------------------------------------------------- #
    def _build_variation(
        self, data: VariationCreate, *, sku: str, index: int
    ) -> ProductVariation:
        return ProductVariation(
            name=data.name,
            sub_sku=data.sub_sku or f"{sku}-{index}",
            default_purchase_price=data.default_purchase_price,
            default_sell_price=data.default_sell_price,
            profit_percent=data.profit_percent,
        )

    async def _generate_sku(self) -> str:
        """`<prefix><NNNN>` — business ka sabse bada number le kar +1.

        Note: high concurrency par do requests ek hi number le sakti hain;
        us soorat mein DB ka `uq_products_business_sku` constraint bacha lega.
        """
        prefix = DEFAULT_SKU_PREFIX
        next_number = await self.repository.max_sku_number(prefix) + 1
        return f"{prefix}{next_number:0{SKU_NUMBER_WIDTH}d}"
