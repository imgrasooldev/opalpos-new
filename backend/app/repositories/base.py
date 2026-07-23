"""Repository base classes — Laravel ke Eloquent model + global scopes ka barabar.

Repository hi WAHID layer hai jo database se baat karti hai. Usay HTTP ka pata
nahi hota aur business rules ka bhi nahi — bas persist aur query.

Do class hain:

    BaseRepository    -> plain CRUD + `query()` (koi scope nahi)
    TenantRepository  -> upar se DO GLOBAL SCOPE khud lagta hai:

                             business_id == current_business_id()
                             deleted_at IS NULL

                         (Laravel ke `BelongsToTenant` + `SoftDeletes` trait
                         jaisa. Har query par khud-ba-khud lagta hai.)

PEHLE KYA MASLA THA: har repository apna `_conditions()` likhti thi aur base
ke generic `get()/list()/count()` tenant filter NAHI lagate the — bhoolne par
ek business ka data doosre ko chala jata. Ab tenant-scoped model ke liye
`TenantRepository` se `query()` ke ilawa koi raasta hai hi nahi, aur scope
usmein pehle se laga hota hai. Bhoolna mumkin nahi.

Scope jaan-boojh kar hatana ho (login ke waqt business context hoti hi nahi)
to naam se saaf zahir hota hai: `query_without_scopes()`.
"""

from datetime import UTC, datetime
from typing import Any, Generic, TypeVar

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import Base
from app.core.tenancy import current_business_id
from app.repositories.query import Criterion, QueryBuilder

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """Model + session ko bandh kar chainable `query()` deta hai.

    Subclass sirf `model` set karti hai::

        class BrandRepository(BaseRepository[Brand]):
            model = Brand
    """

    model: type[ModelType]

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # ------------------------------------------------------------------ #
    # reads
    # ------------------------------------------------------------------ #
    def query(self) -> QueryBuilder[ModelType]:
        return QueryBuilder(self.model, self.session)

    async def find(self, id: Any) -> ModelType | None:
        """Primary key se — Laravel ka `Model::find($id)`."""
        return await self.session.get(self.model, id)

    # ------------------------------------------------------------------ #
    # writes
    # ------------------------------------------------------------------ #
    async def create(self, obj: ModelType) -> ModelType:
        self.session.add(obj)
        return await self._persist(obj)

    async def update(self, obj: ModelType, data: dict[str, Any]) -> ModelType:
        """Laravel ka `->fill($data)->save()`."""
        for field, value in data.items():
            setattr(obj, field, value)
        self.session.add(obj)
        return await self._persist(obj)

    async def delete(self, obj: ModelType) -> None:
        """Hard delete. Soft-delete wale models par `TenantRepository.soft_delete()`."""
        await self.session.delete(obj)
        await self.session.flush()

    async def _persist(self, obj: ModelType) -> ModelType:
        # flush -> INSERT/UPDATE chalti hai; refresh -> server defaults
        # (id, created_at) wapas object mein aa jate hain. Commit request ke
        # aakhir mein `get_session()` karta hai.
        await self.session.flush()
        await self.session.refresh(obj)
        return obj


class TenantRepository(BaseRepository[ModelType]):
    """Business-scoped model ke liye — `BusinessScopedMixin` + `SoftDeleteMixin`."""

    def global_scopes(self) -> tuple[Criterion, ...]:
        """Har query par lagne wali shartein. Subclass chahe to barha sakti hai."""
        return (
            self.model.business_id == current_business_id(),  # type: ignore[attr-defined]
            self.model.deleted_at.is_(None),  # type: ignore[attr-defined]
        )

    def query(self) -> QueryBuilder[ModelType]:
        return super().query().where(*self.global_scopes())

    def query_without_scopes(self) -> QueryBuilder[ModelType]:
        """Scope ke baghair — sirf tab jab tenant context maujood hi na ho
        (misal: login, jahan business abhi maloom nahi). Listing mein kabhi nahi."""
        return super().query()

    async def find(self, id: Any) -> ModelType | None:
        """Scoped — doosre business ki row `None` aati hai, milti nahi.

        `BaseRepository.find()` ko jaan-boojh kar override kiya hai: wo
        `session.get()` se identity map se bhi row utha leta, scope check
        kiye baghair.
        """
        return await self.query().where(self.model.id == id).first()  # type: ignore[attr-defined]

    async def soft_delete(self, obj: ModelType) -> ModelType:
        """Row uda-te nahi — `deleted_at` set karte hain (Laravel SoftDeletes).

        POS mein records kabhi hard-delete nahi hote: purani transactions
        unhe reference karti hain.
        """
        return await self.update(obj, {"deleted_at": datetime.now(UTC)})
