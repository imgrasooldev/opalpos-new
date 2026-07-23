"""Demo data — ek poora business jisse app turant chal kar dekhi ja sake.

Kya banata hai (saare rishton ke saath):

    Business "Opal Demo Store"
      |- BusinessLocation  x2
      |- Role "Owner"   (is_admin, saari permissions)
      |- Role "Cashier" (sirf product.view)
      |- User owner@demo.test    -> Owner role
      |- User cashier@demo.test  -> Cashier role
      |- Unit / Category / Brand
      |- Product x2  -> har product ki ProductVariation

Idempotent hai — dobara chalao to kuch duplicate nahi hoga.

Login karne ke liye:
    POST /api/v1/auth/login  {"email": "owner@demo.test", "password": "owner12345"}
"""

from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.db.seeders.base import BaseSeeder
from app.models.business import Business, BusinessLocation
from app.models.product import Brand, Category, Product, ProductVariation, Unit
from app.models.role import Permission, Role
from app.models.user import User

BUSINESS_NAME = "Opal Demo Store"

ALL_PERMISSIONS = [
    ("product.view", "Products dekhna"),
    ("product.create", "Naya product banana"),
    ("product.update", "Product edit karna"),
    ("product.delete", "Product delete karna"),
    ("user.view", "Users dekhna"),
    ("user.create", "Naya user banana"),
    ("user.update", "User edit karna"),
    ("user.delete", "User delete karna"),
    ("business.view", "Business settings dekhna"),
    ("business.update", "Business settings badalna"),
]

CASHIER_PERMISSIONS = ["product.view"]


class DemoSeeder(BaseSeeder):
    name = "demo business"

    async def run(self, session: AsyncSession) -> None:
        existing = await session.execute(
            select(Business).where(Business.name == BUSINESS_NAME)
        )
        if existing.scalar_one_or_none() is not None:
            return  # already seeded

        permissions = await self._ensure_permissions(session)

        business = Business(name=BUSINESS_NAME, currency_code="USD", sku_prefix="SKU")

        # --- locations (one-to-many) --------------------------------- #
        business.locations.append(BusinessLocation(name="Main Store"))
        business.locations.append(BusinessLocation(name="Warehouse"))

        # --- roles (many-to-many with permissions) ------------------- #
        owner_role = Role(name="Owner", is_admin=True)
        owner_role.permissions = list(permissions.values())

        cashier_role = Role(name="Cashier", is_admin=False)
        cashier_role.permissions = [permissions[p] for p in CASHIER_PERMISSIONS]

        business.roles.extend([owner_role, cashier_role])

        # --- users (many-to-one: business + role) -------------------- #
        owner = User(
            email="owner@demo.test",
            full_name="Demo Owner",
            hashed_password=hash_password("owner12345"),
        )
        owner.role = owner_role

        cashier = User(
            email="cashier@demo.test",
            full_name="Demo Cashier",
            hashed_password=hash_password("cashier12345"),
        )
        cashier.role = cashier_role

        business.users.extend([owner, cashier])

        # --- lookups + products -------------------------------------- #
        unit = Unit(name="Pieces", short_name="Pc", allow_decimal=False)
        category = Category(name="Beverages")
        brand = Brand(name="Opal")
        # business_id relationship se khud set ho jata hai (business.products)
        for obj in (unit, category, brand):
            obj.business = business  # type: ignore[attr-defined]

        session.add(business)
        # products ko unit/category/brand ki id chahiye, isliye pehle flush
        await session.flush()

        business.products.extend(
            [
                self._product(
                    name="Espresso 250ml",
                    sku="SKU0001",
                    unit=unit,
                    category=category,
                    brand=brand,
                    purchase="1.2000",
                    sell="2.5000",
                ),
                self._product(
                    name="Green Tea 500ml",
                    sku="SKU0002",
                    unit=unit,
                    category=category,
                    brand=brand,
                    purchase="0.9000",
                    sell="1.9000",
                ),
            ]
        )
        await session.flush()

    # ------------------------------------------------------------------ #
    def _product(
        self,
        *,
        name: str,
        sku: str,
        unit: Unit,
        category: Category,
        brand: Brand,
        purchase: str,
        sell: str,
    ) -> Product:
        product = Product(
            name=name,
            type="single",
            sku=sku,
            unit_id=unit.id,
            category_id=category.id,
            brand_id=brand.id,
        )
        product.variations.append(
            ProductVariation(
                name="DUMMY",
                sub_sku=f"{sku}-1",
                default_purchase_price=Decimal(purchase),
                default_sell_price=Decimal(sell),
            )
        )
        return product

    async def _ensure_permissions(
        self, session: AsyncSession
    ) -> dict[str, Permission]:
        names = [name for name, _ in ALL_PERMISSIONS]
        result = await session.execute(
            select(Permission).where(Permission.name.in_(names))
        )
        found = {p.name: p for p in result.scalars().all()}

        for name, description in ALL_PERMISSIONS:
            if name not in found:
                permission = Permission(name=name, description=description)
                session.add(permission)
                found[name] = permission

        await session.flush()
        return found
