from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.repositories.user import UserRepository
from app.services.user import UserService

SessionDep = Annotated[AsyncSession, Depends(get_session)]


def get_user_service(session: SessionDep) -> UserService:
    """Wire repository -> service for a single request."""
    repository = UserRepository(session)
    return UserService(repository)


UserServiceDep = Annotated[UserService, Depends(get_user_service)]
