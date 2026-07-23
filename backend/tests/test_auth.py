"""Auth flow: register, login, me, refresh, aur guards."""

import pytest
from httpx import AsyncClient

from tests.conftest import register_business


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_readiness(client: AsyncClient):
    resp = await client.get("/health/ready")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ready"


@pytest.mark.asyncio
async def test_register_creates_business_role_and_owner(client: AsyncClient):
    headers = await register_business(client)

    resp = await client.get("/api/v1/auth/me", headers=headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]

    assert data["email"] == "owner@test.local"
    # rishtay response mein aane chahiye
    assert data["business"]["name"] == "Test Store"
    assert data["role"]["name"] == "Owner"
    assert data["role"]["is_admin"] is True
    assert "product.view" in data["permissions"]


@pytest.mark.asyncio
async def test_login_returns_tokens(client: AsyncClient):
    await register_business(client)

    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "owner@test.local", "password": "owner12345"},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert data["access_token"]
    assert data["refresh_token"]


@pytest.mark.asyncio
async def test_login_with_wrong_password_is_401(client: AsyncClient):
    await register_business(client)

    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "owner@test.local", "password": "wrong-password"},
    )
    assert resp.status_code == 401
    assert resp.json()["success"] is False


@pytest.mark.asyncio
async def test_login_with_unknown_email_is_401(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@test.local", "password": "whatever123"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_refresh_issues_new_tokens(client: AsyncClient):
    await register_business(client)
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "owner@test.local", "password": "owner12345"},
    )
    refresh_token = login.json()["data"]["refresh_token"]

    resp = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": refresh_token}
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["data"]["access_token"]


@pytest.mark.asyncio
async def test_access_token_is_not_accepted_as_refresh(client: AsyncClient):
    headers = await register_business(client)
    access = headers["Authorization"].removeprefix("Bearer ")

    resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": access})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_duplicate_business_email_conflicts(client: AsyncClient):
    await register_business(client)

    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "business_name": "Another Store",
            "email": "owner@test.local",
            "password": "other12345",
        },
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_weak_password_is_rejected(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "business_name": "Weak Store",
            "email": "weak@test.local",
            "password": "password",  # koi digit nahi
        },
    )
    assert resp.status_code == 422
    assert resp.json()["errors"]


@pytest.mark.asyncio
async def test_protected_route_without_token_is_401(client: AsyncClient):
    resp = await client.get("/api/v1/products")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_without_token_is_401(client: AsyncClient):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401
