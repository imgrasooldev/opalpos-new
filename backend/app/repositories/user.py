"""user repository — BaseRepository se inherit karo.

TENANT SAFETY: `search()` / `count_search()` / `get_scoped()` business-scoped
hain — user listing ke liye hamesha yehi use karo.

Do methods jaan-boojh kar UNSCOPED hain:
  - `get_by_email()`  -> login ke waqt abhi business context hoti hi nahi
  - `get()`           -> `get_current_user()` verified JWT ki id se call karta hai
Inhe kisi listing/search ke liye use mat karna.
"""

from sqlalchemy import ColumnElement, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.tenancy import current_business_id
from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(User, session)

    # --- unscoped (auth ke liye) ---------------------------------------- #
    async def get_by_email(self, email: str) -> User | None:
        """Login ke liye — is waqt tenant context set nahi hoti."""
        stmt = select(User).where(User.email == email, User.deleted_at.is_(None))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    # --- tenant-scoped --------------------------------------------------- #
    def _conditions(
        self, *, q: str | None = None, only_active: bool = False
    ) -> list[ColumnElement[bool]]:
        conditions: list[ColumnElement[bool]] = [
            User.business_id == current_business_id(),
            User.deleted_at.is_(None),
        ]
        if q:
            pattern = f"%{q}%"
            conditions.append(
                or_(User.email.ilike(pattern), User.full_name.ilike(pattern))
            )
        if only_active:
            conditions.append(User.is_active.is_(True))
        return conditions

    async def get_scoped(self, user_id: int) -> User | None:
        stmt = select(User).where(User.id == user_id, *self._conditions())
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def search(
        self, *, skip: int = 0, limit: int = 20, **filters
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

    async def count_search(self, **filters) -> int:
        stmt = (
            select(func.count()).select_from(User).where(*self._conditions(**filters))
        )
        result = await self.session.execute(stmt)
        return int(result.scalar_one())

    async def email_exists(self, email: str, *, exclude_id: int | None = None) -> bool:
        """Email globally unique hai (login identifier hai), isliye unscoped."""
        stmt = select(User.id).where(User.email == email, User.deleted_at.is_(None))
        if exclude_id is not None:
            stmt = stmt.where(User.id != exclude_id)
        result = await self.session.execute(stmt.limit(1))
        return result.scalar_one_or_none() is not None
