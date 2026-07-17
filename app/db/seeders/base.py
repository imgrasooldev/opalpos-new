from abc import ABC, abstractmethod

from sqlalchemy.ext.asyncio import AsyncSession


class BaseSeeder(ABC):
    """A seeder inserts sample/reference data. Keep them **idempotent** —
    running them twice must not create duplicates."""

    name: str = "base"

    @abstractmethod
    async def run(self, session: AsyncSession) -> None:  # pragma: no cover
        ...
