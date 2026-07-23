"""business ke Pydantic request/response schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.validators import validate_non_blank


class LocationBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    is_active: bool = True

    @field_validator("name")
    @classmethod
    def _name_not_blank(cls, v: str) -> str:
        return validate_non_blank(v)


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    is_active: bool | None = None


class LocationRead(LocationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class BusinessUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    currency_code: str | None = Field(default=None, max_length=8)
    sku_prefix: str | None = Field(default=None, max_length=32)


class BusinessRead(BaseModel):
    """Business + uski locations (relationship nested response mein)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    currency_code: str
    sku_prefix: str | None = None
    is_active: bool
    created_at: datetime
    locations: list[LocationRead] = []
