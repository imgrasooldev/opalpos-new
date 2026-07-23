"""Mobile/terminal API: /api/v1/products

REFERENCE SLICE — endpoint layer ka tareeqa.

Endpoint ka kaam sirf teen cheezein hain:
  1. Input parse/validate karana (Pydantic schema + Query params)
  2. Permission check (`require_permission("product.view")`)
  3. Service call kar ke result ko envelope mein wrap karna

Business logic yahan bilkul nahi. Agar yahan `if` lag raha hai to shayad wo
service mein jana chahiye.
"""

from fastapi import APIRouter, Query, Response

from app.api.deps import ProductServiceDep, require_permission
from app.schemas.product import ProductCreate, ProductRead, ProductUpdate
from app.utils.pagination import Page, PageParamsDep
from app.utils.response import ApiResponse, created, no_content, ok

router = APIRouter(prefix="/products", tags=["products"])


@router.get(
    "",
    response_model=ApiResponse[list[ProductRead]],
    dependencies=[require_permission("product.view")],
)
async def list_products(
    service: ProductServiceDep,
    params: PageParamsDep,
    q: str | None = Query(None, description="Naam ya SKU mein search (ILIKE)"),
    category_id: int | None = Query(None),
    brand_id: int | None = Query(None),
    only_active: bool = Query(False, description="Sirf active products"),
) -> Response:
    filters = {
        "q": q,
        "category_id": category_id,
        "brand_id": brand_id,
        "only_active": only_active,
    }
    products = await service.list_products(
        skip=params.offset, limit=params.size, **filters
    )
    total = await service.count_products(**filters)

    items = [ProductRead.model_validate(p) for p in products]
    page = Page.create(items, total=total, params=params)
    # data = list, meta = pagination
    return ok(items, meta=page.model_dump(exclude={"items"}))


@router.post(
    "",
    response_model=ApiResponse[ProductRead],
    status_code=201,
    dependencies=[require_permission("product.create")],
)
async def create_product(payload: ProductCreate, service: ProductServiceDep) -> Response:
    product = await service.create_product(payload)
    return created(ProductRead.model_validate(product), message="Product created")


@router.get(
    "/{product_id}",
    response_model=ApiResponse[ProductRead],
    dependencies=[require_permission("product.view")],
)
async def get_product(product_id: int, service: ProductServiceDep) -> Response:
    product = await service.get_product(product_id)
    return ok(ProductRead.model_validate(product))


@router.patch(
    "/{product_id}",
    response_model=ApiResponse[ProductRead],
    dependencies=[require_permission("product.update")],
)
async def update_product(
    product_id: int, payload: ProductUpdate, service: ProductServiceDep
) -> Response:
    product = await service.update_product(product_id, payload)
    return ok(ProductRead.model_validate(product), message="Product updated")


@router.delete(
    "/{product_id}",
    status_code=204,
    dependencies=[require_permission("product.delete")],
)
async def delete_product(product_id: int, service: ProductServiceDep) -> Response:
    await service.delete_product(product_id)
    return no_content()
