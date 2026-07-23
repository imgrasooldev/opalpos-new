"""Mobile/terminal API: /api/v1/users

Sirf current business ke users — scoping `UserRepository` ke global scopes se
hoti hai.

Error handling ka dhaancha `endpoints/products.py` ke docstring mein samjhaya
gaya hai (reference slice).
"""

from fastapi import APIRouter, File, Query, Response, UploadFile

from app.api.deps import UserServiceDep, require_permission
from app.core.exceptions import HANDLED_ERRORS
from app.core.logging import get_logger
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.utils.pagination import PageParamsDep, paginated
from app.utils.response import ApiResponse, created, no_content, ok

router = APIRouter(prefix="/users", tags=["users"])
log = get_logger("api.users")


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
    try:
        users, total = await service.paginate_users(
            skip=params.offset,
            limit=params.size,
            q=q,
            role_id=role_id,
            only_active=only_active,
        )
    except HANDLED_ERRORS:
        raise
    except Exception:
        log.exception("user.list.failed", q=q, role_id=role_id, page=params.page)
        raise

    items = [UserRead.model_validate(u) for u in users]
    return paginated(items, total=total, params=params)


@router.post(
    "",
    response_model=ApiResponse[UserRead],
    status_code=201,
    dependencies=[require_permission("user.create")],
)
async def create_user(payload: UserCreate, service: UserServiceDep) -> Response:
    try:
        user = await service.create_user(payload)
    except HANDLED_ERRORS:
        raise
    except Exception:
        # password kabhi log mein nahi — sirf email/role
        log.exception("user.create.failed", email=payload.email, role_id=payload.role_id)
        raise

    return created(UserRead.model_validate(user), message="User created")


@router.get(
    "/{user_id}",
    response_model=ApiResponse[UserRead],
    dependencies=[require_permission("user.view")],
)
async def get_user(user_id: int, service: UserServiceDep) -> Response:
    try:
        user = await service.get_user(user_id)
    except HANDLED_ERRORS:
        raise
    except Exception:
        log.exception("user.get.failed", user_id=user_id)
        raise

    return ok(UserRead.model_validate(user))


@router.patch(
    "/{user_id}",
    response_model=ApiResponse[UserRead],
    dependencies=[require_permission("user.update")],
)
async def update_user(
    user_id: int, payload: UserUpdate, service: UserServiceDep
) -> Response:
    try:
        user = await service.update_user(user_id, payload)
    except HANDLED_ERRORS:
        raise
    except Exception:
        # sirf field ke NAAM log hote hain, values nahi (password ho sakta hai)
        log.exception(
            "user.update.failed",
            user_id=user_id,
            fields=sorted(payload.model_dump(exclude_unset=True)),
        )
        raise

    return ok(UserRead.model_validate(user), message="User updated")


@router.post(
    "/{user_id}/avatar",
    response_model=ApiResponse[UserRead],
    dependencies=[require_permission("user.update")],
)
async def upload_avatar(
    user_id: int, service: UserServiceDep, file: UploadFile = File(...)
) -> Response:
    try:
        user = await service.set_avatar(user_id, file)
    except HANDLED_ERRORS:
        raise
    except Exception:
        log.exception(
            "user.avatar.failed",
            user_id=user_id,
            filename=file.filename,
            content_type=file.content_type,
        )
        raise

    return ok(UserRead.model_validate(user), message="Avatar updated")


@router.delete(
    "/{user_id}",
    status_code=204,
    dependencies=[require_permission("user.delete")],
)
async def delete_user(user_id: int, service: UserServiceDep) -> Response:
    try:
        await service.delete_user(user_id)
    except HANDLED_ERRORS:
        raise
    except Exception:
        log.exception("user.delete.failed", user_id=user_id)
        raise

    return no_content()
