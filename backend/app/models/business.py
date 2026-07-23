"""business, business_locations, currencies, tax_rates.

Ye tenant ki jad (root) hai — baaki lagbhag har table isi ke `business_id` se
scoped hai (dekho `app/db/mixins.py` -> `BusinessScopedMixin`).

Abhi sirf utna banaya hai jitna product slice chalane ke liye chahiye
(Business + BusinessLocation). Currencies aur tax_rates isi file mein add karna.

Rishtay (relationships) — Business tenant ki jad hai, is liye sab ONE-TO-MANY:

    Business 1 --- * BusinessLocation  (business_locations.business_id)
    Business 1 --- * User              (users.business_id)
    Business 1 --- * Role              (roles.business_id)
    Business 1 --- * Product           (products.business_id)
"""

from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.db.mixins import BusinessScopedMixin, SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    # Sirf type checker ke liye — runtime par import nahi hota, is liye
    # circular import (product -> business -> product) nahi banta.
    # SQLAlchemy relationship ke string names khud runtime par resolve karta hai.
    from app.models.product import Product
    from app.models.role import Role
    from app.models.user import User


class Business(Base, TimestampMixin, SoftDeleteMixin):
    """Tenant. Ye khud BusinessScopedMixin use NAHI karta — yehi scope hai."""

    __tablename__ = "business"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    currency_code: Mapped[str] = mapped_column(
        String(8), default="USD", nullable=False
    )
    # UltimatePOS ka SKU prefix — ProductService isse SKU banata hai
    sku_prefix: Mapped[str | None] = mapped_column(String(32), default=None)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # --- rishtay -------------------------------------------------------- #
    # Business tenant ki jad hai, is liye iske saare rishtay ONE-TO-MANY hain
    # (FK hamesha doosri table par: <table>.business_id).

    # ONE-TO-MANY: ek Business ki bohot si BusinessLocation
    #   lazy="selectin" — `GET /business` response mein locations nested aati hain
    locations: Mapped[list["BusinessLocation"]] = relationship(
        back_populates="business",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    # ONE-TO-MANY: ek Business ke bohot se Users
    users: Mapped[list["User"]] = relationship(
        back_populates="business",
        cascade="all, delete-orphan",
    )

    # ONE-TO-MANY (one-directional): ek Business ke bohot se Roles.
    # `back_populates` nahi — Role se wapas business par jane ki zaroorat
    # nahi padti (permission check business_id se hota hai, object se nahi).
    roles: Mapped[list["Role"]] = relationship(
        cascade="all, delete-orphan",
    )

    # ONE-TO-MANY: ek Business ke bohot se Products
    products: Mapped[list["Product"]] = relationship(
        back_populates="business",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Business id={self.id} name={self.name!r}>"


class BusinessLocation(Base, TimestampMixin, SoftDeleteMixin, BusinessScopedMixin):
    """Ek business ke andar dukaan/branch. Stock isi ke against rakha jata hai."""

    __tablename__ = "business_locations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # MANY-TO-ONE: bohot si locations ek Business ki (Business.locations ka ulta rukh)
    business: Mapped[Business] = relationship(back_populates="locations")

    def __repr__(self) -> str:
        return f"<BusinessLocation id={self.id} name={self.name!r}>"
