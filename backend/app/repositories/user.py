"""user repository.

`list()`/`count()`/`get()` tenant-scoped hain (`_conditions()` ki pehli do
lines). Do reads jaan-boojh kar UNSCOPED hain, naam se saaf zahir:

    get_by_email()   -> login; is waqt business context hoti hi nahi
    get_for_auth()   -> verified JWT ki id se user load karna

`email_exists()` bhi unscoped hai — email GLOBALLY unique hai (login identifier).
Inhe kisi listing/search ke liye use mat karna.
"""

from sqlalchemy import ColumnElement, func, or_, select

from app.core.tenancy import current_business_id
from app.models.role import Role
from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    model = User

    # --- unscoped (auth ke liye) --------------------------------------- #
    async def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email, User.deleted_at.is_(None))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_for_auth(self, user_id: int) -> User | None:
        """`role`/`business` model par `lazy="selectin"` hain — permission check
        ke waqt extra query nahi lagti."""
        stmt = select(User).where(User.id == user_id, User.deleted_at.is_(None))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def email_exists(self, email: str, *, exclude_id: int | None = None) -> bool:
        stmt = select(User.id).where(User.email == email, User.deleted_at.is_(None))
        if exclude_id is not None:
            stmt = stmt.where(User.id != exclude_id)
        result = await self.session.execute(stmt.limit(1))
        return result.scalar_one_or_none() is not None

    # --- tenant-scoped -------------------------------------------------- #
    def _conditions(
        self, *, q: str | None = None, role_id: int | None = None, only_active: bool = False
    ) -> list[ColumnElement[bool]]:
        conditions: list[ColumnElement[bool]] = [
            User.business_id == current_business_id(),
            User.deleted_at.is_(None),
        ]
        if q:
            pattern = f"%{q}%"
            conditions.append(
                or_(
                    User.email.ilike(pattern),
                    User.full_name.ilike(pattern),
                    # MANY-TO-ONE -> .has(): role ke naam se ("cashier" -> saare cashiers)
                    User.role.has(Role.name.ilike(pattern)),
                )
            )
        if role_id is not None:
            conditions.append(User.role.has(Role.id == role_id))
        if only_active:
            conditions.append(User.is_active.is_(True))
        return conditions

    async def get(self, user_id: int) -> User | None:
        stmt = select(User).where(User.id == user_id, *self._conditions())
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list(
        self, *, skip: int = 0, limit: int = 20, **filters: object
    ) -> list[User]:
        stmt = (
            select(User)
            .where(*self._conditions(**filters))
            .order_by(User.email)
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count(self, **filters: object) -> int:
        stmt = select(func.count()).select_from(User).where(*self._conditions(**filters))
        result = await self.session.execute(stmt)
        return int(result.scalar_one())
