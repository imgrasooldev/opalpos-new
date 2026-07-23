"""BusinessUtil.php -> settings, onboarding."""

from app.core.exceptions import ConflictError, NotFoundError
from app.models.business import Business, BusinessLocation
from app.repositories.business import BusinessRepository, LocationRepository
from app.schemas.business import BusinessUpdate, LocationCreate, LocationUpdate


class BusinessService:
    def __init__(
        self, businesses: BusinessRepository, locations: LocationRepository
    ) -> None:
        self.businesses = businesses
        self.locations = locations

    # --- business ------------------------------------------------------- #
    async def get_current(self) -> Business:
        business = await self.businesses.current()
        if business is None:
            raise NotFoundError("Business not found")
        return business

    async def update_current(self, data: BusinessUpdate) -> Business:
        business = await self.get_current()
        return await self.businesses.update(
            business, data.model_dump(exclude_unset=True)
        )

    # --- locations ------------------------------------------------------ #
    async def list_locations(self) -> list[BusinessLocation]:
        return await self.locations.all()

    async def get_location(self, location_id: int) -> BusinessLocation:
        location = await self.locations.find(location_id)
        if location is None:
            raise NotFoundError(f"Location {location_id} not found")
        return location

    async def create_location(self, data: LocationCreate) -> BusinessLocation:
        if await self.locations.name_exists(data.name):
            raise ConflictError(f"Location '{data.name}' already exists")

        business = await self.get_current()
        location = BusinessLocation(name=data.name, is_active=data.is_active)
        # rishte ke zariye — `business_id` haath se set nahi karte, SQLAlchemy
        # flush par khud bhar deta hai (Laravel: `$business->locations()->save()`)
        business.locations.append(location)
        return await self.locations.create(location)

    async def update_location(
        self, location_id: int, data: LocationUpdate
    ) -> BusinessLocation:
        location = await self.get_location(location_id)
        payload = data.model_dump(exclude_unset=True)

        new_name = payload.get("name")
        if new_name and new_name != location.name:
            # apne aap se takra na jaye, is liye khud ko chhorh kar check
            if await self.locations.name_exists(new_name, exclude_id=location.id):
                raise ConflictError(f"Location '{new_name}' already exists")

        return await self.locations.update(location, payload)
