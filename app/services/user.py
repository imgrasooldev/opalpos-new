from fastapi import UploadFile

from app.core.exceptions import ConflictError, NotFoundError
from app.core.security import hash_password
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.user import UserCreate, UserUpdate
from app.utils.files import delete_file, save_image


class UserService:
    """Business logic for users.

    The service orchestrates repositories and enforces business rules
    (uniqueness, hashing, etc.). It never touches HTTP or the DB session
    directly — it goes through the repository.
    """

    def __init__(self, repository: UserRepository) -> None:
        self.repository = repository

    async def get_user(self, user_id: int) -> User:
        user = await self.repository.get(user_id)
        if user is None:
            raise NotFoundError(f"User {user_id} not found")
        return user

    async def list_users(self, *, skip: int = 0, limit: int = 100) -> list[User]:
        return await self.repository.list(skip=skip, limit=limit)

    async def count_users(self) -> int:
        return await self.repository.count()

    async def create_user(self, data: UserCreate) -> User:
        existing = await self.repository.get_by_email(data.email)
        if existing is not None:
            raise ConflictError(f"Email {data.email} is already registered")

        user = User(
            email=data.email,
            full_name=data.full_name,
            hashed_password=hash_password(data.password),
        )
        return await self.repository.create(user)

    async def update_user(self, user_id: int, data: UserUpdate) -> User:
        user = await self.get_user(user_id)

        payload = data.model_dump(exclude_unset=True)

        # Guard against email collisions when the email is being changed.
        new_email = payload.get("email")
        if new_email and new_email != user.email:
            other = await self.repository.get_by_email(new_email)
            if other is not None:
                raise ConflictError(f"Email {new_email} is already registered")

        # Never store a raw password.
        if "password" in payload:
            payload["hashed_password"] = hash_password(payload.pop("password"))

        return await self.repository.update(user, payload)

    async def set_avatar(self, user_id: int, file: UploadFile) -> User:
        user = await self.get_user(user_id)

        # Save the new image via the shared helper (validates type & size).
        new_url = await save_image(file, subdir="avatars")

        # Clean up the previous avatar file, if any.
        old_url = user.avatar_url
        user = await self.repository.update(user, {"avatar_url": new_url})
        if old_url:
            delete_file(old_url)

        return user

    async def delete_user(self, user_id: int) -> None:
        user = await self.get_user(user_id)
        if user.avatar_url:
            delete_file(user.avatar_url)
        await self.repository.delete(user)
