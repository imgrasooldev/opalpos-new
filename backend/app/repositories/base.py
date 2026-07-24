"""Repository base — sirf writes yahan common hain.

Repository hi WAHID layer hai jo database se baat karti hai. Usay HTTP ka pata
nahi hota aur business rules ka bhi nahi — bas persist aur query.

Reads (get/list/count) jaan-boojh kar yahan generic NAHI rakhe: har model ka
tenant-scope aur filter alag hote hain, is liye har repository apni `select()`
khud likhti hai (seedha SQLAlchemy ORM, koi jaadu nahi). Isi se ye ghalti bhi
nahi ho sakti ke koi generic `list()` tenant filter lagaye baghair chal jaye.
"""

from datetime import UTC, datetime
from typing import Any, Generic, TypeVar

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """Subclass sirf `model` set karti hai::

        class ProductRepository(BaseRepository[Product]):
            model = Product
    """

    model: type[ModelType]

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, obj: ModelType) -> ModelType:
        self.session.add(obj)
        return await self._save(obj)

    async def update(self, obj: ModelType, data: dict[str, Any]) -> ModelType:
        for field, value in data.items():
            setattr(obj, field, value)
        self.session.add(obj)
        return await self._save(obj)

    async def delete(self, obj: ModelType) -> None:
        """Hard delete. Soft-delete wale models par `soft_delete()` use karo."""
        await self.session.delete(obj)
        await self.session.flush()

    async def soft_delete(self, obj: ModelType) -> ModelType:
        """Row uda-te nahi — `deleted_at` set karte hain (Laravel SoftDeletes).

        POS mein records kabhi hard-delete nahi hote: purani transactions
        unhe reference karti hain.
        """
        return await self.update(obj, {"deleted_at": datetime.now(UTC)})

    async def _save(self, obj: ModelType) -> ModelType:
        # flush -> INSERT/UPDATE chalti hai; refresh -> server defaults
        # (id, created_at) wapas object mein aa jate hain. Commit request ke
        # aakhir mein `get_session()` karta hai.
        await self.session.flush()
        await self.session.refresh(obj)
        return obj
