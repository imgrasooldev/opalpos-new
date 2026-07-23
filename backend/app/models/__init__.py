"""Saare ORM models yahan import karo.

Zaroori kyun (do wajah):

  1. Alembic ka autogenerate aur `Base.metadata.create_all` sirf un tables ko
     dekhte hain jo import ho chuki hon.
  2. Relationships strings se resolve hoti hain (`"Business"`, `"Role"`). Agar
     wo class import hi na hui ho, to pehli query par
     `InvalidRequestError: expression 'Business' failed to locate a name`
     aata hai.

Naya model file banao to niche list mein add karna na bhoolo.
"""

from app.models.business import Business, BusinessLocation
from app.models.product import (
    PRODUCT_TYPES,
    Brand,
    Category,
    Product,
    ProductVariation,
    Unit,
)
from app.models.role import Permission, Role, role_permissions
from app.models.user import User

__all__ = [
    "PRODUCT_TYPES",
    "Brand",
    "Business",
    "BusinessLocation",
    "Category",
    "Permission",
    "Product",
    "ProductVariation",
    "Role",
    "Unit",
    "User",
    "role_permissions",
]
