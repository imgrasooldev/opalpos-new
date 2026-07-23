"""Request-scoped context — request id, current user, current business.

UltimatePOS multi-tenant hai: har table `business_id` se scoped hai. Agar ye
scoping kahin miss ho jaye to ek business ka data doosre ko dikh jayega. Isliye
context yahan ek jagah rakha hai, aur `TenantMiddleware` ise har request par set
karta hai.

Use:
    from app.core.tenancy import current_business_id
    stmt = select(Product).where(Product.business_id == current_business_id())
"""

from contextvars import ContextVar

from app.core.exceptions import UnauthorizedError

_request_id: ContextVar[str | None] = ContextVar("request_id", default=None)
_user_id: ContextVar[int | None] = ContextVar("user_id", default=None)
_business_id: ContextVar[int | None] = ContextVar("business_id", default=None)
_location_id: ContextVar[int | None] = ContextVar("location_id", default=None)


# --------------------------------------------------------------------------- #
# setters — sirf middleware inhe call karta hai
# --------------------------------------------------------------------------- #
def set_request_id(value: str | None) -> None:
    _request_id.set(value)


def set_actor(
    *,
    user_id: int | None,
    business_id: int | None,
    location_id: int | None = None,
) -> None:
    _user_id.set(user_id)
    _business_id.set(business_id)
    _location_id.set(location_id)


def reset() -> None:
    _request_id.set(None)
    _user_id.set(None)
    _business_id.set(None)
    _location_id.set(None)


# --------------------------------------------------------------------------- #
# getters
# --------------------------------------------------------------------------- #
def request_id() -> str | None:
    return _request_id.get()


def user_id_optional() -> int | None:
    return _user_id.get()


def business_id_optional() -> int | None:
    return _business_id.get()


def location_id() -> int | None:
    return _location_id.get()


def current_user_id() -> int:
    value = _user_id.get()
    if value is None:
        raise UnauthorizedError("No authenticated user in this request")
    return value


def current_business_id() -> int:
    """Har tenant-scoped query mein use karo. Missing ho to fail-closed."""
    value = _business_id.get()
    if value is None:
        raise UnauthorizedError("No business scope in this request")
    return value
