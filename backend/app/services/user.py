"""User business logic.

Yahan banne wale users hamesha *current business* ke andar bante hain
(`current_business_id()` se) — request body se business_id kabhi nahi liya
jata, warna koi doosre business mein user ghusa dega.

Naya business banane wala pehla (owner) user yahan se nahi, `AuthService.register()`
se banta hai.
"""

from fastapi import UploadFile

from app.core.exceptions import ConflictError, NotFoundError
from app.core.security import hash_password
from app.core.tenancy import current_business_id
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.user import UserCreate, UserUpdate
from app.utils.files import delete_file, save_image


class UserService:
    def __init__(self, repository: UserRepository) -> None:
        self.repository = repository

    # --- reads ----------------------------------------------------------- #
    async def get_user(self, user_id: int) -> User:
        user = await self.repository.find(user_id)
        if user is None:
            # doosre business ka user bhi "not found" — uske wujood ka pata na chale
            raise NotFoundError(f"User {user_id} not found")
        return user

    async def paginate_users(
        self, *, skip: int = 0, limit: int = 20, **filters
    ) -> tuple[list[User], int]:
        return await self.repository.paginate(skip=skip, limit=limit, **filters)

    # --- writes ---------------------------------------------------------- #
    async def create_user(self, data: UserCreate) -> User:
        if await self.repository.email_exists(data.email):
            raise ConflictError(f"Email {data.email} is already registered")

        user = User(
            business_id=current_business_id(),  # context se, body se nahi
            email=data.email,
            full_name=data.full_name,
            role_id=data.role_id,
            hashed_password=hash_password(data.password),
        )
        return await self.repository.create(user)

    async def update_user(self, user_id: int, data: UserUpdate) -> User:
        user = await self.get_user(user_id)
        payload = data.model_dump(exclude_unset=True)

        new_email = payload.get("email")
        if new_email and new_email != user.email:
            if await self.repository.email_exists(new_email, exclude_id=user.id):
                raise ConflictError(f"Email {new_email} is already registered")

        # raw password kabhi store nahi hota
        if "password" in payload:
            payload["hashed_password"] = hash_password(payload.pop("password"))

        return await self.repository.update(user, payload)

    async def set_avatar(self, user_id: int, file: UploadFile) -> User:
        """File pehle disk par jati hai, phir DB par.

        Do alag "stores" hain (disk + DB) aur unke darmiyan koi transaction
        nahi — is liye yahan try/except zaroori hai: DB update na chale to
        abhi likhi hui file disk par kachra ban kar reh jati.
        """
        user = await self.get_user(user_id)
        old_url = user.avatar_url
        new_url = await save_image(file, subdir="avatars")

        try:
            user = await self.repository.update(user, {"avatar_url": new_url})
        except Exception:
            # naya file hata kar error aage bhejo — handle karna uska kaam nahi
            delete_file(new_url)
            raise

        if old_url:
            delete_file(old_url)
        return user

    async def delete_user(self, user_id: int) -> None:
        """Soft delete — purane records (audit, transactions) user ko refer karte hain."""
        user = await self.get_user(user_id)
        await self.repository.soft_delete(user)
