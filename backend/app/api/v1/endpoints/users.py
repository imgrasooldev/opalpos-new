"""Mobile/terminal API: /api/v1/users

Sirf current business ke users — scoping `UserRepository` mein hoti hai.
Errors global handlers sambhalte hain (dekho `endpoints/products.py`).
"""

from fastapi import APIRouter, File, Query, Response, UploadFile

from app.api.deps import UserServiceDep, require_permission
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.utils.pagination import PageParamsDep, paginated
from app.utils.response import ApiResponse, created, no_content, ok

router = APIRouter(prefix="/users", tags=["users"])


@router.get(
    "",
    response_model=ApiResponse[list[UserRead]],
    dependencies=[require_permission("user.view")],
)
async def list_users(
    service: UserServiceDep,
    params: PageParamsDep,
    q: str | None = Query(None, description="Email, naam ya role ke naam mein search"),
    role_id: int | None = Query(None, description="Sirf is role ke users"),
    only_active: bool = Query(False),
) -> Response:
    users, total = await service.paginate_users(
        skip=params.offset,
        limit=params.size,
        q=q,
        role_id=role_id,
        only_active=only_active,
    )
    items = [UserRead.model_validate(u) for u in users]
    return paginated(items, total=total, params=params)


@router.post(
    "",
    response_model=ApiResponse[UserRead],
    status_code=201,
    dependencies=[require_permission("user.create")],
)
async def create_user(payload: UserCreate, service: UserServiceDep) -> Response:
    user = await service.create_user(payload)
    return created(UserRead.model_validate(user), message="User created")


@router.get(
    "/{user_id}",
    response_model=ApiResponse[UserRead],
    dependencies=[require_permission("user.view")],
)
async def get_user(user_id: int, service: UserServiceDep) -> Response:
    user = await service.get_user(user_id)
    return ok(UserRead.model_validate(user))


@router.patch(
    "/{user_id}",
    response_model=ApiResponse[UserRead],
    dependencies=[require_permission("user.update")],
)
async def update_user(
    user_id: int, payload: UserUpdate, service: UserServiceDep
) -> Response:
    user = await service.update_user(user_id, payload)
    return ok(UserRead.model_validate(user), message="User updated")


@router.post(
    "/{user_id}/avatar",
    response_model=ApiResponse[UserRead],
    dependencies=[require_permission("user.update")],
)
async def upload_avatar(
    user_id: int, service: UserServiceDep, file: UploadFile = File(...)
) -> Response:
    user = await service.set_avatar(user_id, file)
    return ok(UserRead.model_validate(user), message="Avatar updated")


@router.delete(
    "/{user_id}",
    status_code=204,
    dependencies=[require_permission("user.delete")],
)
async def delete_user(user_id: int, service: UserServiceDep) -> Response:
    await service.delete_user(user_id)
    return no_content()
