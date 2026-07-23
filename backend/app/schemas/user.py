"""user ke Pydantic request/response schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.schemas.validators import validate_non_blank, validate_password_strength


class RoleBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    is_admin: bool


class UserBase(BaseModel):
    email: EmailStr
    full_name: str | None = None

    @field_validator("full_name")
    @classmethod
    def _name_not_blank(cls, v: str | None) -> str | None:
        return validate_non_blank(v)


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)
    # business_id yahan NAHI hai — wo token se aata hai (dekho UserService)
    role_id: int | None = None

    @field_validator("password")
    @classmethod
    def _password_strength(cls, v: str) -> str:
        return validate_password_strength(v)


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)
    role_id: int | None = None
    is_active: bool | None = None

    @field_validator("full_name")
    @classmethod
    def _name_not_blank(cls, v: str | None) -> str | None:
        return validate_non_blank(v)

    @field_validator("password")
    @classmethod
    def _password_strength(cls, v: str | None) -> str | None:
        return validate_password_strength(v) if v is not None else v


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    avatar_url: str | None = None
    is_active: bool
    business_id: int | None = None
    created_at: datetime
    updated_at: datetime
    # relationship — model par lazy="selectin" hai
    role: RoleBrief | None = None
