"""Async engine, session factory aur declarative Base.

Pool tuning production mein ahem hai: har uvicorn worker apna pool banata hai,
to Postgres ka `max_connections` >= workers * (DB_POOL_SIZE + DB_MAX_OVERFLOW)
hona chahiye, warna peak par "too many connections" milega.
"""

from collections.abc import AsyncGenerator
from typing import Any

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    """Base class for all ORM models."""


def _engine_kwargs() -> dict[str, Any]:
    kwargs: dict[str, Any] = {
        # DEBUG se alag knob — warna dev mein har query do baar log hoti hai
        # (SQLAlchemy ka apna handler + structlog ka root handler).
        "echo": settings.DB_ECHO,
        "future": True,
    }
    # SQLite ka async driver pooling options support nahi karta — sirf
    # Postgres/MySQL par lagao.
    if not settings.DATABASE_URL.startswith("sqlite"):
        kwargs.update(
            pool_size=settings.DB_POOL_SIZE,
            max_overflow=settings.DB_MAX_OVERFLOW,
            # mari hui connection (DB restart / idle timeout) pehle hi detect ho
            pool_pre_ping=True,
            # connections ko har 30 min par recycle — proxies inhe chup-chaap girate hain
            pool_recycle=1800,
        )
    return kwargs


engine = create_async_engine(settings.DATABASE_URL, **_engine_kwargs())

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields a database session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Tables `create_all` se banata hai — SIRF local dev/test ke liye.

    Production mein schema ka wahid source Alembic hai (`alembic upgrade head`).
    Isliye ye production mein chalne se inkar karta hai: agar dono chalein to
    Alembic "table already exists" par fail karti hai.
    """
    if settings.APP_ENV == "production":
        raise RuntimeError(
            "init_db() production mein mat chalao — `alembic upgrade head` use karo"
        )

    # Saare models import ho jayein taake Base.metadata poori bhar jaye.
    import app.models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
