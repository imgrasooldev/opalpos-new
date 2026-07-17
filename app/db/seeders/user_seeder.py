from sqlalchemy.ext.asyncio import AsyncSession

from app.db.seeders.base import BaseSeeder
from app.repositories.user import UserRepository
from app.schemas.user import UserCreate
from app.services.user import UserService


class UserSeeder(BaseSeeder):
    name = "users"

    SEED_USERS: list[dict] = [
        {
            "email": "admin@example.com",
            "full_name": "Admin User",
            "password": "admin12345",
        },
        {
            "email": "john@example.com",
            "full_name": "John Doe",
            "password": "password123",
        },
    ]

    async def run(self, session: AsyncSession) -> None:
        # Go through the service so business rules & hashing apply,
        # exactly like a real signup.
        service = UserService(UserRepository(session))
        for data in self.SEED_USERS:
            existing = await service.repository.get_by_email(data["email"])
            if existing is not None:
                continue  # idempotent: skip already-seeded users
            await service.create_user(UserCreate(**data))
