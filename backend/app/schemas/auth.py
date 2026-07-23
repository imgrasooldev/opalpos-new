"""auth ke Pydantic request/response schemas."""

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.schemas.validators import validate_password_strength


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class RegisterRequest(BaseModel):
    """Naya business + uska pehla (owner) user, ek hi call mein."""

    business_name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = None

    @field_validator("password")
    @classmethod
    def _password_strength(cls, v: str) -> str:
        return validate_password_strength(v)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class RoleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    is_admin: bool


class BusinessBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class MeResponse(BaseModel):
    """`GET /auth/me` — user + uske rishtay (business, role, permissions)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str | None = None
    avatar_url: str | None = None
    is_active: bool
    business: BusinessBrief | None = None
    role: RoleRead | None = None
    permissions: list[str] = []
