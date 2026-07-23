"""business repository — BaseRepository se inherit karo."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.tenancy import current_business_id
from app.models.business import Business, BusinessLocation
from app.repositories.base import BaseRepository


class BusinessRepository(BaseRepository[Business]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Business, session)

    async def get_current(self) -> Business | None:
        """Token wali business. `locations` relationship saath hi aa jati hai
        (model par lazy="selectin")."""
        stmt = select(Business).where(
            Business.id == current_business_id(),
            Business.deleted_at.is_(None),
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    # --- locations ------------------------------------------------------ #
    async def list_locations(self) -> list[BusinessLocation]:
        stmt = (
            select(BusinessLocation)
            .where(
                BusinessLocation.business_id == current_business_id(),
                BusinessLocation.deleted_at.is_(None),
            )
            .order_by(BusinessLocation.name)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_location(self, location_id: int) -> BusinessLocation | None:
        stmt = select(BusinessLocation).where(
            BusinessLocation.id == location_id,
            BusinessLocation.business_id == current_business_id(),
            BusinessLocation.deleted_at.is_(None),
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def location_name_exists(self, name: str) -> bool:
        stmt = (
            select(func.count())
            .select_from(BusinessLocation)
            .where(
                BusinessLocation.business_id == current_business_id(),
                BusinessLocation.name == name,
                BusinessLocation.deleted_at.is_(None),
            )
        )
        result = await self.session.execute(stmt)
        return int(result.scalar_one()) > 0

    async def add_location(self, location: BusinessLocation) -> BusinessLocation:
        self.session.add(location)
        await self.session.flush()
        await self.session.refresh(location)
        return location
