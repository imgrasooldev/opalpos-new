"""login, token issue/refresh, password reset.

Auth ka poora business logic yahan. Endpoint sirf ise call karta hai.

Token ke andar `bid` (business_id) bhi jata hai — `TenantMiddleware` usay
har request par `tenancy` context mein daal deta hai, isi liye services ko
`business_id` parameter pass karne ki zaroorat nahi padti.
"""

import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, UnauthorizedError
from app.core.security import (
    TokenAudience,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_and_upgrade,
)
from app.models.business import Business, BusinessLocation
from app.models.role import Permission, Role
from app.models.user import User
from app.repositories.user import UserRepository

# Naye business ke owner role ko ye permissions milti hain. Role `is_admin`
# hai isliye check bypass ho jata hai, lekin list yahan rakhi hai taake seeder
# aur docs dono ek hi jagah se aayein.
DEFAULT_PERMISSIONS = [
    "product.view",
    "product.create",
    "product.update",
    "product.delete",
    "user.view",
    "user.create",
    "user.update",
    "user.delete",
    "business.view",
    "business.update",
]


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.users = UserRepository(session)

    # ----------------------------------------------------------------- #
    # register — naya business + owner user
    # ----------------------------------------------------------------- #
    async def register(
        self,
        *,
        business_name: str,
        email: str,
        password: str,
        full_name: str | None = None,
        audience: TokenAudience = "web",
    ) -> tuple[User, str, str]:
        if await self.users.find_by_email(email) is not None:
            raise ConflictError(f"Email {email} is already registered")

        business = Business(name=business_name)
        # cascade="all, delete-orphan" ki wajah se ye sab ek hi flush mein
        # save ho jate hain — manual id juggling ki zaroorat nahi
        business.locations.append(BusinessLocation(name="Main Location"))

        owner_role = Role(name="Owner", is_admin=True)
        owner_role.permissions = await self._ensure_permissions(DEFAULT_PERMISSIONS)
        business.roles.append(owner_role)

        user = User(
            email=email,
            full_name=full_name,
            hashed_password=hash_password(password),
        )
        user.role = owner_role
        business.users.append(user)

        self.session.add(business)
        await self.session.flush()
        await self.session.refresh(user)

        return (user, *self._issue_tokens(user, audience=audience))

    # ----------------------------------------------------------------- #
    # login / refresh
    # ----------------------------------------------------------------- #
    async def login(
        self, *, email: str, password: str, audience: TokenAudience = "web"
    ) -> tuple[User, str, str]:
        user = await self.users.find_by_email(email)

        # Ek hi generic message — warna attacker ko pata chal jayega ke
        # kaunsa email register hai
        invalid = UnauthorizedError("Incorrect email or password")
        if user is None:
            raise invalid

        ok, new_hash = verify_and_upgrade(password, user.hashed_password)
        if not ok:
            raise invalid
        if not user.is_active:
            raise UnauthorizedError("This account is disabled")

        # purana Laravel bcrypt hash chup-chaap argon2 mein upgrade ho jata hai
        if new_hash is not None:
            await self.users.update(user, {"hashed_password": new_hash})

        return (user, *self._issue_tokens(user, audience=audience))

    async def refresh(
        self, refresh_token: str, *, audience: TokenAudience = "web"
    ) -> tuple[str, str]:
        try:
            payload = decode_token(refresh_token, audience=audience)
        except jwt.PyJWTError as exc:
            raise UnauthorizedError("Invalid or expired refresh token") from exc

        if payload.get("typ") != "refresh":
            raise UnauthorizedError("Not a refresh token")

        user = await self.users.find_for_auth(int(payload["sub"]))
        if user is None or not user.is_active:
            raise UnauthorizedError("User no longer active")

        return self._issue_tokens(user, audience=audience)

    # ----------------------------------------------------------------- #
    # helpers
    # ----------------------------------------------------------------- #
    def _issue_tokens(self, user: User, *, audience: TokenAudience) -> tuple[str, str]:
        return (
            create_access_token(
                user.id, audience=audience, business_id=user.business_id
            ),
            create_refresh_token(user.id, audience=audience),
        )

    async def _ensure_permissions(self, names: list[str]) -> list[Permission]:
        """Permissions global hain — jo maujood hain unhe reuse karo, baaki banao."""
        result = await self.session.execute(
            select(Permission).where(Permission.name.in_(names))
        )
        existing = {p.name: p for p in result.scalars().all()}

        out: list[Permission] = []
        for name in names:
            permission = existing.get(name)
            if permission is None:
                permission = Permission(name=name)
                self.session.add(permission)
            out.append(permission)
        return out
