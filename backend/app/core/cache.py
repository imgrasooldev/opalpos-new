"""Redis cache — cashews (Laravel `Cache::` facade ka replacement).

NOTE: Tenant safety — cache key mein hamesha `business_id` daalo, warna ek business
ka cached data doosre ko mil jayega. `tenant_key()` helper isi liye hai.

Use:
    from app.core.cache import cache, tenant_key

    @cache(ttl="5m", key=tenant_key("products:{category_id}"))
    async def list_products(category_id: int): ...
"""

from cashews import cache

from app.core.config import settings
from app.core.tenancy import business_id_optional


def setup_cache() -> None:
    """App startup par call karo."""
    cache.setup(
        settings.REDIS_URL,
        client_side=False,          # POS multi-worker hai; local copy stale ho sakti hai
        pickle_type="dill",
    )


def tenant_key(template: str) -> str:
    """`"products:{id}"` -> `"b:{business_id}:products:{id}"`."""
    return "b:{business_id}:" + template


async def invalidate_business(pattern: str) -> None:
    """Current business ke liye matching keys delete karo.

    Misaal: product update hone par `await invalidate_business("products:*")`.
    """
    business_id = business_id_optional()
    if business_id is None:
        return
    await cache.delete_match(f"b:{business_id}:{pattern}")


__all__ = ["cache", "invalidate_business", "setup_cache", "tenant_key"]
