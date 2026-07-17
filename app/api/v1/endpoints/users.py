from typing import Annotated

from fastapi import APIRouter, Depends, File, Response, UploadFile

from app.api.deps import UserServiceDep
from app.schemas.user import UserCreate, UserCreateForm, UserRead, UserUpdate
from app.utils.pagination import Page, PageParamsDep
from app.utils.response import ApiResponse, created, no_content, ok

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/get", response_model=ApiResponse[list[UserRead]])
async def list_users(service: UserServiceDep, params: PageParamsDep) -> Response:
    users = await service.list_users(skip=params.offset, limit=params.size)
    total = await service.count_users()

    items = [UserRead.model_validate(u) for u in users]
    page = Page.create(items, total=total, params=params)
    # data = the list; meta = pagination info (total, page, size, pages).
    return ok(items, meta=page.model_dump(exclude={"items"}))


@router.post("", response_model=ApiResponse[UserRead], status_code=201)
async def create_user(payload: UserCreate, service: UserServiceDep) -> Response:
    """Create a user from a JSON body."""
    user = await service.create_user(payload)
    return created(UserRead.model_validate(user), message="User created")


@router.post("/signup", response_model=ApiResponse[UserRead], status_code=201)
async def signup(
    service: UserServiceDep,
    form: Annotated[UserCreateForm, Depends(UserCreateForm.as_form)],
    avatar: UploadFile | None = File(None),
) -> Response:
    """Create a user from multipart form data, with an optional avatar file.

    Form fields are validated by the same Pydantic rules as the JSON endpoint.
    """
    user = await service.create_user(UserCreate(**form.model_dump()))
    if avatar is not None:
        user = await service.set_avatar(user.id, avatar)
    return created(UserRead.model_validate(user), message="User created")


@router.get("/{user_id}", response_model=ApiResponse[UserRead])
async def get_user(user_id: int, service: UserServiceDep) -> Response:
    user = await service.get_user(user_id)
    return ok(UserRead.model_validate(user))


@router.patch("/{user_id}", response_model=ApiResponse[UserRead])
async def update_user(
    user_id: int, payload: UserUpdate, service: UserServiceDep
) -> Response:
    user = await service.update_user(user_id, payload)
    return ok(UserRead.model_validate(user), message="User updated")


@router.post("/{user_id}/avatar", response_model=ApiResponse[UserRead])
async def upload_avatar(
    user_id: int, service: UserServiceDep, file: UploadFile = File(...)
) -> Response:
    user = await service.set_avatar(user_id, file)
    return ok(UserRead.model_validate(user), message="Avatar updated")


@router.delete("/{user_id}", status_code=204)
async def delete_user(user_id: int, service: UserServiceDep) -> Response:
    await service.delete_user(user_id)
    return no_content()
