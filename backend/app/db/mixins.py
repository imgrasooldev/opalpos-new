"""Model mixins — har POS model inhe use karega.

PostgreSQL notes (MySQL/UltimatePOS se aate waqt):
  - MySQL ka `unsigned` PG mein nahi hota  -> CheckConstraint(col >= 0)
  - MySQL `enum` ki jagah VARCHAR + CheckConstraint (PG enum ALTER karna painful hai)
  - Paisa/quantity hamesha Numeric(22, 4) — Float kabhi nahi, warna stock aur
    COGS mein rounding errors aayenge
  - MySQL case-insensitive collation deta tha; PG case-SENSITIVE hai. Product
    name/SKU search ke liye ILIKE use karo ya citext extension.
"""

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column

# Poore codebase mein paise/quantity ke liye yehi types use karo
Money = Numeric(22, 4)
Qty = Numeric(22, 4)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class SoftDeleteMixin:
    """Laravel ke SoftDeletes trait ke barabar."""

    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), index=True, default=None
    )


class BusinessScopedMixin:
    """Multi-tenant scoping — POS ke lagbhag har table par lagta hai.

    Repository layer ko hamesha `business_id == current_business_id()` filter
    lagana chahiye. Ise bhoolna = cross-tenant data leak.
    """

    business_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("business.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )


class AuditMixin:
    """Kisne banaya / badla — commission attribution isi par chalta hai."""

    created_by: Mapped[int | None] = mapped_column(BigInteger, index=True, default=None)
    updated_by: Mapped[int | None] = mapped_column(BigInteger, default=None)


__all__ = [
    "AuditMixin",
    "BusinessScopedMixin",
    "Money",
    "Qty",
    "SoftDeleteMixin",
    "TimestampMixin",
]
