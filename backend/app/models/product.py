"""products, variations, categories, brands, units.

REFERENCE SLICE — naya model banate waqt isi file ko dekho.

Yahan jo conventions dikh rahi hain, wo har POS table par lagti hain:

  1. Mixins: TimestampMixin + SoftDeleteMixin + BusinessScopedMixin + AuditMixin
  2. Paisa/quantity ke liye `Money` / `Qty` (Numeric(22,4)) — `Float` kabhi nahi
  3. MySQL ka `unsigned` PG mein nahi -> CheckConstraint(col >= 0)
  4. MySQL ka `enum` PG mein painful -> VARCHAR + CheckConstraint
  5. Tenant uniqueness hamesha (business_id, <col>) par — sirf <col> par nahi,
     warna do businesses ek hi SKU use nahi kar payenge

Rishtay (relationships):

    Business  1 --- * Product          (many-to-one:  products.business_id)
    Product   1 --- * ProductVariation (one-to-many:  product_variations.product_id)
    Unit      1 --- * Product          (many-to-one:  products.unit_id)
    Category  1 --- * Product          (many-to-one:  products.category_id)
    Brand     1 --- * Product          (many-to-one:  products.brand_id)
    Category  1 --- * Category         (self-FK: parent_id se sub-category)

Aasan qaida: **FK jis table par hai, wahi "many" side hai.**
"""

from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.db.mixins import (
    AuditMixin,
    BusinessScopedMixin,
    Money,
    Qty,
    SoftDeleteMixin,
    TimestampMixin,
)

if TYPE_CHECKING:
    # Sirf type checker ke liye — runtime par import nahi hota.
    from app.models.business import Business

# VARCHAR + CheckConstraint (PG enum ki jagah — dekho mixins.py)
PRODUCT_TYPES = ("single", "variable", "combo")


class Category(Base, TimestampMixin, SoftDeleteMixin, BusinessScopedMixin, AuditMixin):
    """Product category. `parent_id` se sub-category banti hai."""

    __tablename__ = "categories"
    __table_args__ = (
        UniqueConstraint("business_id", "name", name="uq_categories_business_name"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    short_code: Mapped[str | None] = mapped_column(String(32), default=None)
    parent_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("categories.id", ondelete="SET NULL"), default=None
    )

    def __repr__(self) -> str:
        return f"<Category id={self.id} name={self.name!r}>"


class Brand(Base, TimestampMixin, SoftDeleteMixin, BusinessScopedMixin, AuditMixin):
    __tablename__ = "brands"
    __table_args__ = (
        UniqueConstraint("business_id", "name", name="uq_brands_business_name"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, default=None)

    def __repr__(self) -> str:
        return f"<Brand id={self.id} name={self.name!r}>"


class Unit(Base, TimestampMixin, SoftDeleteMixin, BusinessScopedMixin, AuditMixin):
    """Pcs / Kg / Litre. `allow_decimal` batata hai ke 0.5 qty allowed hai ya nahi."""

    __tablename__ = "units"
    __table_args__ = (
        UniqueConstraint("business_id", "name", name="uq_units_business_name"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    short_name: Mapped[str] = mapped_column(String(32), nullable=False)
    allow_decimal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    def __repr__(self) -> str:
        return f"<Unit id={self.id} name={self.name!r}>"


class Product(Base, TimestampMixin, SoftDeleteMixin, BusinessScopedMixin, AuditMixin):
    """POS ka product.

    `type`:
      single    -> theek ek variation (UltimatePOS usay "DUMMY" kehta hai)
      variable  -> ek ya zyada variations (size/color)
      combo     -> doosre products ka bundle
    """

    __tablename__ = "products"
    __table_args__ = (
        UniqueConstraint("business_id", "sku", name="uq_products_business_sku"),
        CheckConstraint(
            "type IN ('single', 'variable', 'combo')", name="ck_products_type"
        ),
        # PG mein `unsigned` nahi hota — negative alert qty rokni hai
        CheckConstraint(
            "alert_quantity IS NULL OR alert_quantity >= 0",
            name="ck_products_alert_quantity_non_negative",
        ),
        # Product list/search ka main index (business + name)
        Index("ix_products_business_name", "business_id", "name"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(16), default="single", nullable=False)
    sku: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    barcode_type: Mapped[str] = mapped_column(
        String(16), default="C128", nullable=False
    )

    unit_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("units.id", ondelete="RESTRICT"), nullable=False
    )
    category_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("categories.id", ondelete="SET NULL"), default=None
    )
    brand_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("brands.id", ondelete="SET NULL"), default=None
    )

    enable_stock: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    alert_quantity: Mapped[Decimal | None] = mapped_column(Qty, default=None)
    image_url: Mapped[str | None] = mapped_column(String(512), default=None)
    description: Mapped[str | None] = mapped_column(Text, default=None)
    is_inactive: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # --- rishtay -------------------------------------------------------- #
    # ONE-TO-MANY: ek Product ki bohot si ProductVariation
    #   Product.variations (list)  <->  ProductVariation.product (single)
    #   FK doosri taraf hai: product_variations.product_id
    #   cascade delete-orphan: product delete/detach hone par variations bhi jayen
    variations: Mapped[list["ProductVariation"]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        # N+1 se bachne ke liye — list endpoint har product ki variations chahta hai
        lazy="selectin",
    )

    # MANY-TO-ONE: bohot se Products ek Business ke
    #   FK isi table par hai (products.business_id) — isi liye "many" side yahi hai
    business: Mapped["Business"] = relationship(back_populates="products")

    # MANY-TO-ONE (one-directional): bohot se Products ek Category/Brand/Unit ke.
    # `back_populates` nahi diya kyunki ulti taraf (Category.products) ki
    # zaroorat nahi — lookup se saare products kabhi nahi chahiye hote.
    # lazy="selectin" taake response mein category/brand/unit ka naam bhi aa jaye.
    category: Mapped["Category | None"] = relationship(lazy="selectin")
    brand: Mapped["Brand | None"] = relationship(lazy="selectin")
    unit: Mapped["Unit"] = relationship(lazy="selectin")

    def __repr__(self) -> str:
        return f"<Product id={self.id} sku={self.sku!r} name={self.name!r}>"


class ProductVariation(Base, TimestampMixin, SoftDeleteMixin):
    """Product ki bikne wali unit. Stock aur price yahan hote hain, product par nahi.

    NOTE: is table par `business_id` nahi hai (UltimatePOS ki tarah) — scoping
    parent product se aati hai. Isliye variations ko HAMESHA product ke through
    query karo, seedha nahi.
    """

    __tablename__ = "product_variations"
    __table_args__ = (
        UniqueConstraint("product_id", "sub_sku", name="uq_variations_product_sub_sku"),
        CheckConstraint(
            "default_purchase_price >= 0", name="ck_variations_purchase_price_non_negative"
        ),
        CheckConstraint(
            "default_sell_price >= 0", name="ck_variations_sell_price_non_negative"
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    product_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("products.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    # single products ke liye UltimatePOS "DUMMY" rakhta hai
    name: Mapped[str] = mapped_column(String(255), default="DUMMY", nullable=False)
    sub_sku: Mapped[str] = mapped_column(String(64), nullable=False, index=True)

    default_purchase_price: Mapped[Decimal] = mapped_column(
        Money, default=Decimal("0"), nullable=False
    )
    default_sell_price: Mapped[Decimal] = mapped_column(
        Money, default=Decimal("0"), nullable=False
    )
    profit_percent: Mapped[Decimal] = mapped_column(
        Money, default=Decimal("0"), nullable=False
    )

    # MANY-TO-ONE: bohot si variations ek Product ki (Product.variations ka ulta rukh)
    product: Mapped[Product] = relationship(back_populates="variations")

    def __repr__(self) -> str:
        return f"<ProductVariation id={self.id} sub_sku={self.sub_sku!r}>"
