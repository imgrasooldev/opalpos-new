"""Pytest fixtures.

DATABASE_URL yahan app import se PEHLE set hota hai — `Settings` lru_cache par
hai, is liye baad mein badalna kaam nahi karega.

Har test ko taaza DB milti hai (file per test session drop/create), taake ek
test ka data doosre mein na rise.
"""

import os
import pathlib

TEST_DB = pathlib.Path(__file__).parent / "test.db"
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{TEST_DB}"
os.environ["APP_ENV"] = "local"
os.environ["RATE_LIMIT_ENABLED"] = "false"
os.environ["SECRET_KEY"] = "test-secret-key"

import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402

from app.core.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest_asyncio.fixture
async def client():
    """Taaza schema + in-process HTTP client (server chalane ki zaroorat nahi)."""
    import app.models  # noqa: F401  — metadata bharne ke liye

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def register_business(
    client: AsyncClient,
    *,
    business_name: str = "Test Store",
    email: str = "owner@test.local",
    password: str = "owner12345",
) -> dict[str, str]:
    """Naya business + owner banata hai aur auth header wapas deta hai."""
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "business_name": business_name,
            "email": email,
            "password": password,
        },
    )
    assert resp.status_code == 201, resp.text
    token = resp.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def owner_headers(client: AsyncClient) -> dict[str, str]:
    return await register_business(client)


@pytest.fixture
def product_payload() -> dict:
    """Product create ke liye minimum valid body (unit_id test mein bhara jata hai)."""
    return {
        "name": "Test Coffee",
        "type": "single",
        "variations": [{"default_sell_price": "2.5000"}],
    }
