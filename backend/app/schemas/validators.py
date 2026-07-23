"""Reusable field validators shared across schemas.

Keep *structural / format* validation here (things you can check from the
value alone). Business rules that need the database (e.g. "email must be
unique") belong in the service layer, not here.
"""

import re

_PASSWORD_RE = re.compile(r"^(?=.*[A-Za-z])(?=.*\d).+$")


def validate_password_strength(value: str) -> str:
    """Require at least one letter and one digit."""
    if not _PASSWORD_RE.match(value):
        raise ValueError("Password must contain at least one letter and one number")
    return value


def validate_non_blank(value: str | None) -> str | None:
    """Reject strings that are empty or only whitespace (None is allowed)."""
    if value is not None and not value.strip():
        raise ValueError("Value cannot be blank")
    return value
