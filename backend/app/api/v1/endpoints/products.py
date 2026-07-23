"""Mobile/terminal API: /api/v1/products

REFERENCE SLICE — endpoint (controller) layer ka tareeqa.

Endpoint ka kaam sirf teen cheezein hain:
  1. Input parse/validate karana (Pydantic schema + Query params)
  2. Permission check (`require_permission("product.view")`)
  3. Service call kar ke result ko envelope mein wrap karna

Business logic yahan bilkul nahi. Agar yahan `if` lag raha hai to shayad wo
service mein jana chahiye.

ERROR HANDLING — har controller action ka ek jaisa dhaancha:

    try:
        ... service call ...
    except HANDLED_ERRORS:
        raise                      # 404/409/422 — handler jawab bana dega
    except Exception:
        log.exception("<resource>.<action>.failed", <context>)
        raise                      # 500 — handler jawab bana dega

Do baatein jo kabhi mat todna:

  1. Error ko **nigalna nahi** — hamesha `raise`. Envelope aur status code
     `app/main.py` ke handlers banate hain; yahan `return error_response(...)`
     likha to ConflictError ka 409 aur NotFoundError ka 404 zaya ho jayega.
  2. `HANDLED_ERRORS` (domain + DB constraint) ko log NAHI karte — wo rozmarra
     ki baat hai aur handler khud munasib level par log karta hai. `except
     Exception` sirf UNEXPECTED ke liye hai, aur wahi is try/except ka asal
     faida hai: global handler ko sirf URL path pata hota hai, yahan hum
     product_id / SKU jaisa context saath log kar dete hain.
"""

from fastapi import APIRouter, Query, Response

from app.api.deps import ProductServiceDep, require_permission
from app.core.exceptions import HANDLED_ERRORS
from app.core.logging import get_logger
from app.schemas.product import ProductCreate, ProductRead, ProductUpdate
from app.utils.pagination import PageParamsDep, paginated
from app.utils.response import ApiResponse, created, no_content, ok

router = APIRouter(prefix="/products", tags=["products"])
log = get_logger("api.products")


@router.get(
    "",
    response_model=ApiResponse[list[ProductRead]],
    dependencies=[require_permission("product.view")],
)
async def list_products(
    service: ProductServiceDep,
    params: PageParamsDep,
    q: str | None = Query(
        None,
        description="Naam, SKU, sub-SKU, category ya brand ke naam mein search (ILIKE)",
    ),
    category_id: int | None = Query(None),
    brand_id: int | None = Query(None),
    only_active: bool = Query(False, description="Sirf active products"),
) -> Response:
    try:
        products, total = await service.paginate_products(
            skip=params.offset,
            limit=params.size,
            q=q,
            category_id=category_id,
            brand_id=brand_id,
            only_active=only_active,
        )
    except HANDLED_ERRORS:
        raise
    except Exception:
        log.exception("product.list.failed", q=q, page=params.page, size=params.size)
        raise

    items = [ProductRead.model_validate(p) for p in products]
    return paginated(items, total=total, params=params)


@router.post(
    "",
    response_model=ApiResponse[ProductRead],
    status_code=201,
    dependencies=[require_permission("product.create")],
)
async def create_product(payload: ProductCreate, service: ProductServiceDep) -> Response:
    try:
        product = await service.create_product(payload)
    except HANDLED_ERRORS:
        # duplicate SKU par ConflictError (409) — ya race mein IntegrityError,
        # jise handler bhi 409 banata hai
        raise
    except Exception:
        log.exception("product.create.failed", sku=payload.sku, name=payload.name)
        raise

    return created(ProductRead.model_validate(product), message="Product created")


@router.get(
    "/{product_id}",
    response_model=ApiResponse[ProductRead],
    dependencies=[require_permission("product.view")],
)
async def get_product(product_id: int, service: ProductServiceDep) -> Response:
    try:
        product = await service.get_product(product_id)
    except HANDLED_ERRORS:
        raise
    except Exception:
        log.exception("product.get.failed", product_id=product_id)
        raise

    return ok(ProductRead.model_validate(product))


@router.patch(
    "/{product_id}",
    response_model=ApiResponse[ProductRead],
    dependencies=[require_permission("product.update")],
)
async def update_product(
    product_id: int, payload: ProductUpdate, service: ProductServiceDep
) -> Response:
    try:
        product = await service.update_product(product_id, payload)
    except HANDLED_ERRORS:
        raise
    except Exception:
        log.exception(
            "product.update.failed",
            product_id=product_id,
            fields=sorted(payload.model_dump(exclude_unset=True)),
        )
        raise

    return ok(ProductRead.model_validate(product), message="Product updated")


@router.delete(
    "/{product_id}",
    status_code=204,
    dependencies=[require_permission("product.delete")],
)
async def delete_product(product_id: int, service: ProductServiceDep) -> Response:
    try:
        await service.delete_product(product_id)
    except HANDLED_ERRORS:
        raise
    except Exception:
        log.exception("product.delete.failed", product_id=product_id)
        raise

    return no_content()
