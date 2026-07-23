"""BusinessUtil.php -> settings, onboarding."""

from app.core.exceptions import ConflictError, NotFoundError
from app.models.business import Business, BusinessLocation
from app.repositories.business import BusinessRepository
from app.schemas.business import BusinessUpdate, LocationCreate, LocationUpdate


class BusinessService:
    def __init__(self, repository: BusinessRepository) -> None:
        self.repository = repository

    # --- business ------------------------------------------------------- #
    async def get_current(self) -> Business:
        business = await self.repository.get_current()
        if business is None:
            raise NotFoundError("Business not found")
        return business

    async def update_current(self, data: BusinessUpdate) -> Business:
        business = await self.get_current()
        return await self.repository.update(
            business, data.model_dump(exclude_unset=True)
        )

    # --- locations ------------------------------------------------------ #
    async def list_locations(self) -> list[BusinessLocation]:
        return await self.repository.list_locations()

    async def get_location(self, location_id: int) -> BusinessLocation:
        location = await self.repository.get_location(location_id)
        if location is None:
            raise NotFoundError(f"Location {location_id} not found")
        return location

    async def create_location(self, data: LocationCreate) -> BusinessLocation:
        if await self.repository.location_name_exists(data.name):
            raise ConflictError(f"Location '{data.name}' already exists")

        business = await self.get_current()
        location = BusinessLocation(
            # business_id relationship se aata hai — hardcode nahi karte
            business_id=business.id,
            name=data.name,
            is_active=data.is_active,
        )
        return await self.repository.add_location(location)

    async def update_location(
        self, location_id: int, data: LocationUpdate
    ) -> BusinessLocation:
        location = await self.get_location(location_id)
        payload = data.model_dump(exclude_unset=True)

        new_name = payload.get("name")
        if new_name and new_name != location.name:
            if await self.repository.location_name_exists(new_name):
                raise ConflictError(f"Location '{new_name}' already exists")

        return await self.repository.update(location, payload)
