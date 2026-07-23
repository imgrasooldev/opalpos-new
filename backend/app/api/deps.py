"""Shared FastAPI dependencies — DI wiring aur auth guards.

Do hisse hain:

  1. session -> repository -> service   (har resource ke liye ek jaisa)
  2. auth guards: `CurrentUserDep` aur `require_permission("product.view")`

Auth kaise chalta hai:
  - `TenantMiddleware` (app/middleware/request_context.py) JWT decode kar ke
    user_id/business_id ko `tenancy` context mein daal deta hai. Wo enforce
    kuch nahi karta.
  - Enforce yahan hota hai: `get_current_user()` context se id le kar user
    load karta hai, aur `require_permission()` uske role ki permissions check
    karta hai.
"""

from collections.abc import Callable
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.exceptions import AppException, UnauthorizedError
from app.core.tenancy import user_id_optional
from app.models.user import User
from app.repositories.business import BusinessRepository, LocationRepository
from app.repositories.product import ProductRepository
from app.repositories.user import UserRepository
from app.services.auth import AuthService
from app.services.business import BusinessService
from app.services.product import ProductService
from app.services.user import UserService

SessionDep = Annotated[AsyncSession, Depends(get_session)]


class ForbiddenError(AppException):
    status_code = 403
    detail = "You do not have permission to perform this action"


# --------------------------------------------------------------------------- #
# services — naya resource add karte waqt bas ye do lines copy karo
# --------------------------------------------------------------------------- #
def get_user_service(session: SessionDep) -> UserService:
    return UserService(UserRepository(session))


UserServiceDep = Annotated[UserService, Depends(get_user_service)]


def get_product_service(session: SessionDep) -> ProductService:
    return ProductService(ProductRepository(session))


ProductServiceDep = Annotated[ProductService, Depends(get_product_service)]


def get_business_service(session: SessionDep) -> BusinessService:
    return BusinessService(BusinessRepository(session), LocationRepository(session))


BusinessServiceDep = Annotated[BusinessService, Depends(get_business_service)]


def get_auth_service(session: SessionDep) -> AuthService:
    return AuthService(session)


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]


# --------------------------------------------------------------------------- #
# auth guards
# --------------------------------------------------------------------------- #
async def get_current_user(session: SessionDep) -> User:
    """Logged-in user. Token na ho ya user na mile to 401.

    `business` aur `role` relationships `lazy="selectin"` hain, isliye yahin
    load ho jate hain — permission check ke waqt extra query nahi lagti.
    """
    user_id = user_id_optional()
    if user_id is None:
        raise UnauthorizedError("Not authenticated")

    user = await UserRepository(session).find_for_auth(user_id)
    if user is None or not user.is_active:
        raise UnauthorizedError("Not authenticated")
    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]


def require_permission(*permissions: str) -> Callable:
    """Endpoint guard. Diye gaye permissions mein se koi EK bhi ho to allow.

        @router.get("", dependencies=[require_permission("product.view")])

    Admin role (`is_admin=True`) har check pass kar jata hai.
    """

    async def _check(user: CurrentUserDep) -> None:
        if any(user.has_permission(p) for p in permissions):
            return
        raise ForbiddenError(f"Requires one of: {', '.join(permissions)}")

    return Depends(_check)
