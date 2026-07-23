"""roles + permissions.

Role-based access control. Rishtay (relationships):

    Role     * --- * Permission   MANY-TO-MANY  (join table: role_permissions)
    Role     1 --- * User         ONE-TO-MANY   (FK: users.role_id)
    Business 1 --- * Role         ONE-TO-MANY   (FK: roles.business_id)

M2M ki nishani `secondary=` hai — us join table mein apna koi extra column
nahi hota, sirf do foreign keys.

Permission ka naam hamesha `"<resource>.<action>"` hota hai, jaise
`"product.view"`, `"product.create"`. Check karne ka tareeqa:

    user.role.has_permission("product.view")

Roles business-scoped hain, taake har business apne roles bana sake.
"""

from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, Column, ForeignKey, String, Table, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.db.mixins import BusinessScopedMixin, TimestampMixin

if TYPE_CHECKING:
    # Sirf type checker ke liye — runtime par import nahi hota.
    from app.models.user import User

# Many-to-many ka join table. Ye plain Table hai (model class nahi) kyunki
# ismein apna koi extra column nahi — sirf do foreign keys.
role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column(
        "role_id",
        BigInteger,
        ForeignKey("roles.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "permission_id",
        BigInteger,
        ForeignKey("permissions.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Permission(Base, TimestampMixin):
    """Global list — har business ke liye alag nahi banti."""

    __tablename__ = "permissions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(
        String(100), unique=True, index=True, nullable=False
    )
    description: Mapped[str | None] = mapped_column(String(255), default=None)

    # MANY-TO-MANY: ek Permission bohot se Roles mein, ek Role mein bohot si
    # Permissions. `secondary=` join table batata hai — yahi M2M ki nishani hai.
    roles: Mapped[list["Role"]] = relationship(
        secondary=role_permissions,
        back_populates="permissions",
    )

    def __repr__(self) -> str:
        return f"<Permission {self.name!r}>"


class Role(Base, TimestampMixin, BusinessScopedMixin):
    __tablename__ = "roles"
    __table_args__ = (
        UniqueConstraint("business_id", "name", name="uq_roles_business_name"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    # owner/admin — sab kuch allowed, permission list check kiye baghair
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # MANY-TO-MANY: Permission.roles ka ulta rukh (wahi `secondary` join table)
    #   lazy="selectin" — har request mein permission check hota hai, is liye
    #   permissions role ke saath hi load ho jani chahiyen
    permissions: Mapped[list[Permission]] = relationship(
        secondary=role_permissions,
        back_populates="roles",
        # role ke saath permissions ek hi query mein aa jayein
        lazy="selectin",
    )

    # ONE-TO-MANY: ek Role bohot se Users ka (FK users.role_id par hai)
    users: Mapped[list["User"]] = relationship(back_populates="role")

    def has_permission(self, permission: str) -> bool:
        if self.is_admin:
            return True
        return any(p.name == permission for p in self.permissions)

    def __repr__(self) -> str:
        return f"<Role id={self.id} name={self.name!r}>"
