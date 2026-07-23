"""product ke Pydantic request/response schemas.

REFERENCE SLICE — naye resource ke schemas isi shakal mein banao:

    XxxBase    -> shared fields
    XxxCreate  -> create request (Base + create-only fields)
    XxxUpdate  -> sab optional (PATCH ke liye)
    XxxRead    -> response (from_attributes=True taake ORM object se bane)

Yaad rahe: yahan sirf wo validation hoti hai jo value ko *akele* dekh kar ho
sake. Jis rule ko DB chahiye (SKU unique hai?), wo service layer ka kaam hai.
"""

from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.validators import validate_non_blank

ProductType = Literal["single", "variable", "combo"]


# --------------------------------------------------------------------------- #
# Variation
# --------------------------------------------------------------------------- #
class VariationBase(BaseModel):
    name: str = Field(default="DUMMY", max_length=255)
    default_purchase_price: Decimal = Field(default=Decimal("0"), ge=0)
    default_sell_price: Decimal = Field(default=Decimal("0"), ge=0)
    profit_percent: Decimal = Field(default=Decimal("0"), ge=0)


class VariationCreate(VariationBase):
    # khali chhodo to service `<sku>-<n>` bana deti hai
    sub_sku: str | None = Field(default=None, max_length=64)


class VariationRead(VariationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sub_sku: str


# --------------------------------------------------------------------------- #
# Related lookups — model par `lazy="selectin"` hai, isliye ye bina extra
# query ke response mein aa jate hain (relationship ka fayda)
# --------------------------------------------------------------------------- #
class LookupBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


# --------------------------------------------------------------------------- #
# Product
# --------------------------------------------------------------------------- #
class ProductBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    type: ProductType = "single"
    unit_id: int
    category_id: int | None = None
    brand_id: int | None = None
    enable_stock: bool = True
    alert_quantity: Decimal | None = Field(default=None, ge=0)
    description: str | None = None
    is_inactive: bool = False

    @field_validator("name")
    @classmethod
    def _name_not_blank(cls, v: str) -> str:
        return validate_non_blank(v)


class ProductCreate(ProductBase):
    # khali chhodo to service business ke sku_prefix se auto-generate karti hai
    sku: str | None = Field(default=None, max_length=64)
    variations: list[VariationCreate] = Field(min_length=1)

    @model_validator(mode="after")
    def _check_variations_match_type(self) -> "ProductCreate":
        """Cross-field rule — isliye @model_validator, @field_validator nahi."""
        if self.type == "single" and len(self.variations) != 1:
            raise ValueError("A 'single' product must have exactly one variation")
        return self


class ProductUpdate(BaseModel):
    """PATCH — sirf bheje gaye fields update hote hain (exclude_unset)."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    unit_id: int | None = None
    category_id: int | None = None
    brand_id: int | None = None
    enable_stock: bool | None = None
    alert_quantity: Decimal | None = Field(default=None, ge=0)
    description: str | None = None
    is_inactive: bool | None = None

    @field_validator("name")
    @classmethod
    def _name_not_blank(cls, v: str | None) -> str | None:
        return validate_non_blank(v)


class ProductRead(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sku: str
    image_url: str | None = None
    created_at: datetime
    updated_at: datetime

    # nested relationships
    variations: list[VariationRead] = []
    unit: LookupBrief | None = None
    category: LookupBrief | None = None
    brand: LookupBrief | None = None
