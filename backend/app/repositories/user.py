"""user repository.

Tenant scope (`business_id` + soft delete) `TenantRepository` se khud lagta
hai — yahan likhne ki zaroorat nahi.

TEEN methods jaan-boojh kar UNSCOPED hain, aur naam se saaf zahir hai:

    find_by_email()   -> login; is waqt business context hoti hi nahi
    find_for_auth()   -> verified JWT ki id se user load karna
    email_exists()    -> email GLOBALLY unique hai (wahi login identifier hai)

Inhe kisi listing/search ke liye use mat karna.
"""

from sqlalchemy import or_

from app.models.role import Role
from app.models.user import User
from app.repositories.base import TenantRepository
from app.repositories.query import Criterion, QueryBuilder


class UserRepository(TenantRepository[User]):
    model = User

    # ------------------------------------------------------------------ #
    # scopes
    # ------------------------------------------------------------------ #
    @staticmethod
    def matches(term: str) -> Criterion:
        """Email, naam ya ROLE ke naam mein search ("cashier" likh kar saare
        cashiers mil jayen). Role doosri table par hai — join nahi, rishta."""
        pattern = f"%{term}%"
        return or_(
            User.email.ilike(pattern),
            User.full_name.ilike(pattern),
            # MANY-TO-ONE -> .has()
            User.role.has(Role.name.ilike(pattern)),
        )

    @staticmethod
    def in_role(role_id: int) -> Criterion:
        return User.role.has(Role.id == role_id)

    # ------------------------------------------------------------------ #
    # reads — scoped
    # ------------------------------------------------------------------ #
    def filtered(
        self,
        *,
        q: str | None = None,
        role_id: int | None = None,
        only_active: bool = False,
    ) -> QueryBuilder[User]:
        return (
            self.query()
            .when(q, self.matches)
            .when(role_id, self.in_role)
            .when(only_active, lambda _: User.is_active.is_(True))
            .order_by(User.email)
        )

    async def paginate(
        self, *, skip: int = 0, limit: int = 20, **filters: object
    ) -> tuple[list[User], int]:
        return await self.filtered(**filters).paginate(skip=skip, limit=limit)  # type: ignore[arg-type]

    # ------------------------------------------------------------------ #
    # reads — unscoped (sirf auth ke liye)
    # ------------------------------------------------------------------ #
    def _auth_query(self) -> QueryBuilder[User]:
        # tenant scope nahi, magar soft-deleted user phir bhi login na kar sake
        return self.query_without_scopes().where(User.deleted_at.is_(None))

    async def find_by_email(self, email: str) -> User | None:
        return await self._auth_query().where(User.email == email).first()

    async def find_for_auth(self, user_id: int) -> User | None:
        """`role` aur `business` rishte model par `lazy="selectin"` hain, is liye
        permission check ke waqt extra query nahi lagti."""
        return await self._auth_query().where(User.id == user_id).first()

    async def email_exists(self, email: str, *, exclude_id: int | None = None) -> bool:
        return await (
            self._auth_query()
            .where(User.email == email)
            .when(exclude_id, lambda v: User.id != v)
            .exists()
        )
