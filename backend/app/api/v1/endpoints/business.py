"""Mobile/terminal API: /api/v1/business

Business hamesha token se aati hai (`bid` claim), URL se nahi — isliye yahan
koi `{business_id}` path param nahi hai. Ye tenant leak rokne ka sabse aasan
tareeqa hai: client business choose hi nahi kar sakta.
"""

from fastapi import APIRouter, Response

from app.api.deps import BusinessServiceDep, require_permission
from app.schemas.business import (
    BusinessRead,
    BusinessUpdate,
    LocationCreate,
    LocationRead,
    LocationUpdate,
)
from app.utils.response import ApiResponse, created, ok

router = APIRouter(prefix="/business", tags=["business"])


@router.get(
    "",
    response_model=ApiResponse[BusinessRead],
    dependencies=[require_permission("business.view")],
)
async def get_business(service: BusinessServiceDep) -> Response:
    """Business + uski locations (relationship nested aati hai)."""
    business = await service.get_current()
    return ok(BusinessRead.model_validate(business))


@router.patch(
    "",
    response_model=ApiResponse[BusinessRead],
    dependencies=[require_permission("business.update")],
)
async def update_business(
    payload: BusinessUpdate, service: BusinessServiceDep
) -> Response:
    business = await service.update_current(payload)
    return ok(BusinessRead.model_validate(business), message="Business updated")


# --------------------------------------------------------------------------- #
# locations
# --------------------------------------------------------------------------- #
@router.get(
    "/locations",
    response_model=ApiResponse[list[LocationRead]],
    dependencies=[require_permission("business.view")],
)
async def list_locations(service: BusinessServiceDep) -> Response:
    locations = await service.list_locations()
    return ok([LocationRead.model_validate(loc) for loc in locations])


@router.post(
    "/locations",
    response_model=ApiResponse[LocationRead],
    status_code=201,
    dependencies=[require_permission("business.update")],
)
async def create_location(
    payload: LocationCreate, service: BusinessServiceDep
) -> Response:
    location = await service.create_location(payload)
    return created(LocationRead.model_validate(location), message="Location created")


@router.patch(
    "/locations/{location_id}",
    response_model=ApiResponse[LocationRead],
    dependencies=[require_permission("business.update")],
)
async def update_location(
    location_id: int, payload: LocationUpdate, service: BusinessServiceDep
) -> Response:
    location = await service.update_location(location_id, payload)
    return ok(LocationRead.model_validate(location), message="Location updated")
