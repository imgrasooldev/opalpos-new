"""Smoke tests for the users API.

Run with:  pytest -q
Requires:  pip install pytest pytest-asyncio httpx
"""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.core.database import init_db
from app.main import app


@pytest_asyncio.fixture
async def client():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_create_and_get_user(client: AsyncClient):
    payload = {
        "email": "test@example.com",
        "full_name": "Test User",
        "password": "supersecret123",
    }
    create = await client.post("/api/v1/users", json=payload)
    assert create.status_code == 201, create.text
    body = create.json()
    assert body["success"] is True
    data = body["data"]
    assert data["email"] == payload["email"]
    assert "hashed_password" not in data
    user_id = data["id"]

    got = await client.get(f"/api/v1/users/{user_id}")
    assert got.status_code == 200
    assert got.json()["data"]["id"] == user_id


@pytest.mark.asyncio
async def test_duplicate_email_conflicts(client: AsyncClient):
    payload = {"email": "dup@example.com", "password": "supersecret123"}
    first = await client.post("/api/v1/users", json=payload)
    assert first.status_code == 201
    second = await client.post("/api/v1/users", json=payload)
    assert second.status_code == 409
    assert second.json()["success"] is False


@pytest.mark.asyncio
async def test_invalid_password_is_rejected(client: AsyncClient):
    # Too short and no digit -> 422 validation error envelope.
    payload = {"email": "weak@example.com", "password": "short"}
    resp = await client.post("/api/v1/users", json=payload)
    assert resp.status_code == 422
    body = resp.json()
    assert body["success"] is False
    assert body["errors"]


@pytest.mark.asyncio
async def test_list_users_is_paginated(client: AsyncClient):
    resp = await client.get("/api/v1/users?page=1&size=10")
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert isinstance(body["data"], list)
    assert {"total", "page", "size", "pages"} <= set(body["meta"])
