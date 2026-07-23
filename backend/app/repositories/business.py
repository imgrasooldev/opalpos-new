"""business + locations repository.

Do repositories hain, kyunki dono ki scoping alag hai:

    BusinessRepository -> Business KHUD tenant hai. Uska scope `id` par lagta
                          hai, `business_id` par nahi — is liye `BaseRepository`
                          par bana kar `query()` override kiya hai.

    LocationRepository -> BusinessLocation aam tenant-scoped table hai, to
                          `TenantRepository` sab kuch khud sambhal leta hai.
"""

from app.core.tenancy import current_business_id
from app.models.business import Business, BusinessLocation
from app.repositories.base import BaseRepository, TenantRepository
from app.repositories.query import QueryBuilder


class BusinessRepository(BaseRepository[Business]):
    model = Business

    def query(self) -> QueryBuilder[Business]:
        # tenant KHUD yehi row hai — token wali business ke ilawa kuch nahi
        return (
            super()
            .query()
            .where(
                Business.id == current_business_id(),
                Business.deleted_at.is_(None),
            )
        )

    async def current(self) -> Business | None:
        """`locations` rishta model par `lazy="selectin"` hai — saath hi aa jata hai."""
        return await self.query().first()


class LocationRepository(TenantRepository[BusinessLocation]):
    model = BusinessLocation

    def ordered(self) -> QueryBuilder[BusinessLocation]:
        return self.query().order_by(BusinessLocation.name)

    async def all(self) -> list[BusinessLocation]:
        return await self.ordered().get()

    async def name_exists(self, name: str, *, exclude_id: int | None = None) -> bool:
        return await (
            self.query()
            .where(BusinessLocation.name == name)
            .when(exclude_id, lambda v: BusinessLocation.id != v)
            .exists()
        )
