"""users — business aur role se juda hua.

Rishtay (relationships):

    Business 1 --- * User   MANY-TO-ONE  (FK yahan: users.business_id)
    Role     1 --- * User   MANY-TO-ONE  (FK yahan: users.role_id)

Dono FK isi table par hain, is liye User dono rishton mein "many" side hai.
"""

from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.db.mixins import SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    # Sirf type checker ke liye — runtime par import nahi hota.
    from app.models.business import Business
    from app.models.role import Role


class User(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    full_name: Mapped[str | None] = mapped_column(String(255), default=None)
    avatar_url: Mapped[str | None] = mapped_column(String(512), default=None)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # --- rishtay -------------------------------------------------------- #
    # Pehla user (business banane wala) ke paas abhi business nahi hoti,
    # isliye nullable hai.
    business_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("business.id", ondelete="CASCADE"),
        index=True,
        default=None,
    )
    role_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("roles.id", ondelete="SET NULL"), default=None
    )

    # MANY-TO-ONE: bohot se Users ek Business ke (FK yahan hai: users.business_id)
    business: Mapped["Business | None"] = relationship(
        back_populates="users", lazy="selectin"
    )

    # MANY-TO-ONE: bohot se Users ek Role ke (FK yahan hai: users.role_id)
    #   lazy="selectin" — permission check ke liye role har request mein chahiye,
    #   warna async context mein lazy load par MissingGreenlet error aata hai
    role: Mapped["Role | None"] = relationship(
        back_populates="users", lazy="selectin"
    )

    def has_permission(self, permission: str) -> bool:
        """Role ke through check. Role na ho to kuch bhi allowed nahi."""
        return self.role is not None and self.role.has_permission(permission)

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r}>"
