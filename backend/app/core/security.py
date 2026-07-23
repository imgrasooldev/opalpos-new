"""Password hashing + JWT.

NOTE: Yahan pehle `passlib[bcrypt]` tha. Wo hata diya gaya kyunki:
  - passlib 1.7.4 (2020) bcrypt 5.x ke saath runtime par toot-ta hai
    (`ValueError: password cannot be longer than 72 bytes`)
  - `python-jose` 2021 se unmaintained hai
Ab seedha `bcrypt` + `argon2-cffi` + `pyjwt` use hote hain.

LARAVEL MIGRATION: Laravel `bcrypt` hash ko `$2y$` prefix ke saath likhta hai,
Python ka `bcrypt` `$2b$` expect karta hai. Algorithm bilkul same hai — sirf
prefix ka farq hai. Prefix swap kiye baghair migration ke baad har purana user
lock out ho jayega.
"""

from datetime import UTC, datetime, timedelta
from typing import Any, Literal

import bcrypt
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

from app.core.config import settings

_ph = PasswordHasher()

TokenAudience = Literal["web", "mobile"]
_BCRYPT_PREFIXES = ("$2y$", "$2a$", "$2b$")
# bcrypt 72 bytes se lamba password silently truncate karta tha; ab error deta hai
_BCRYPT_MAX_BYTES = 72


# --------------------------------------------------------------------------- #
# passwords
# --------------------------------------------------------------------------- #
def hash_password(plain_password: str) -> str:
    """Naye passwords argon2id se — bcrypt se behtar aur 72-byte limit nahi."""
    return _ph.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Password check. Argon2 aur legacy Laravel bcrypt dono support karta hai."""
    ok, _ = verify_and_upgrade(plain_password, hashed_password)
    return ok


def verify_and_upgrade(plain_password: str, hashed_password: str) -> tuple[bool, str | None]:
    """Verify + optional rehash.

    Returns ``(ok, new_hash)``. Agar ``new_hash`` None nahi hai to use DB mein
    save kar do — yahi wo jagah hai jahan purane Laravel bcrypt hashes
    dheere-dheere argon2 mein badal jate hain (user ke agle login par).
    """
    if not hashed_password:
        return False, None

    # --- argon2 (naya format) ---
    if hashed_password.startswith("$argon2"):
        try:
            _ph.verify(hashed_password, plain_password)
        except (VerifyMismatchError, InvalidHashError):
            return False, None
        if _ph.check_needs_rehash(hashed_password):
            return True, _ph.hash(plain_password)
        return True, None

    # --- legacy Laravel bcrypt ---
    if settings.ALLOW_LEGACY_LARAVEL_HASH and hashed_password.startswith(_BCRYPT_PREFIXES):
        secret = plain_password.encode("utf-8")[:_BCRYPT_MAX_BYTES]
        normalized = (
            "$2b$" + hashed_password[4:]
            if hashed_password.startswith("$2y$")
            else hashed_password
        )
        try:
            if bcrypt.checkpw(secret, normalized.encode("utf-8")):
                return True, hash_password(plain_password)  # argon2 mein upgrade
        except ValueError:
            return False, None

    return False, None


# --------------------------------------------------------------------------- #
# JWT
# --------------------------------------------------------------------------- #
def create_access_token(
    subject: str | int,
    *,
    audience: TokenAudience = "mobile",
    business_id: int | None = None,
    location_id: int | None = None,
    extra: dict[str, Any] | None = None,
) -> str:
    minutes = (
        settings.MOBILE_TOKEN_EXPIRE_MINUTES
        if audience == "mobile"
        else settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "aud": audience,
        "iat": now,
        "exp": now + timedelta(minutes=minutes),
        "typ": "access",
    }
    if business_id is not None:
        payload["bid"] = business_id
    if location_id is not None:
        payload["lid"] = location_id
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(subject: str | int, *, audience: TokenAudience = "mobile") -> str:
    now = datetime.now(UTC)
    return jwt.encode(
        {
            "sub": str(subject),
            "aud": audience,
            "iat": now,
            "exp": now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
            "typ": "refresh",
        },
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_token(token: str, *, audience: TokenAudience) -> dict[str, Any]:
    """Invalid/expired token par ``jwt.PyJWTError`` raise karta hai."""
    return jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
        audience=audience,
    )
