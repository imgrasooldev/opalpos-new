"""business + locations repository.

Business KHUD tenant hai — uska scope `id` par lagta hai, `business_id` par
nahi. BusinessLocation aam tenant-scoped table hai.
"""

from sqlalchemy import ColumnElement, select

from app.core.tenancy import current_business_id
from app.models.business import Business, BusinessLocation
from app.repositories.base import BaseRepository


class BusinessRepository(BaseRepository[Business]):
    model = Business

    async def current(self) -> Business | None:
        """Token wali business. `locations` model par `lazy="selectin"` hai —
        saath hi aa jati hain."""
        stmt = select(Business).where(
            Business.id == current_business_id(),
            Business.deleted_at.is_(None),
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()


class LocationRepository(BaseRepository[BusinessLocation]):
    model = BusinessLocation

    def _conditions(self) -> list[ColumnElement[bool]]:
        return [
            BusinessLocation.business_id == current_business_id(),
            BusinessLocation.deleted_at.is_(None),
        ]

    async def all(self) -> list[BusinessLocation]:
        stmt = (
            select(BusinessLocation)
            .where(*self._conditions())
            .order_by(BusinessLocation.name)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get(self, location_id: int) -> BusinessLocation | None:
        stmt = select(BusinessLocation).where(
            BusinessLocation.id == location_id, *self._conditions()
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def name_exists(self, name: str, *, exclude_id: int | None = None) -> bool:
        stmt = select(BusinessLocation.id).where(
            BusinessLocation.name == name, *self._conditions()
        )
        if exclude_id is not None:
            stmt = stmt.where(BusinessLocation.id != exclude_id)
        result = await self.session.execute(stmt.limit(1))
        return result.scalar_one_or_none() is not None
