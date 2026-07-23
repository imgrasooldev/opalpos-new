"""Product CRUD, validation, SKU generation aur permissions."""

import pytest
from httpx import AsyncClient

from tests.conftest import register_business


async def _unit_id(client: AsyncClient, headers: dict[str, str]) -> int:
    from app.core.database import AsyncSessionLocal
    from app.models.product import Unit

    me = await client.get("/api/v1/auth/me", headers=headers)
    business_id = me.json()["data"]["business"]["id"]

    async with AsyncSessionLocal() as session:
        unit = Unit(business_id=business_id, name="Pieces", short_name="Pc")
        session.add(unit)
        await session.commit()
        return unit.id


@pytest.mark.asyncio
async def test_create_product_generates_sku(client: AsyncClient, owner_headers):
    unit_id = await _unit_id(client, owner_headers)

    resp = await client.post(
        "/api/v1/products",
        headers=owner_headers,
        json={
            "name": "Espresso",
            "type": "single",
            "unit_id": unit_id,
            "variations": [{"default_sell_price": "2.5000"}],
        },
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()["data"]

    assert data["sku"] == "SKU0001"          # auto-generated
    assert data["variations"][0]["sub_sku"] == "SKU0001-1"
    assert data["unit"]["name"] == "Pieces"  # relationship nested


@pytest.mark.asyncio
async def test_sku_increments(client: AsyncClient, owner_headers):
    unit_id = await _unit_id(client, owner_headers)
    body = {
        "name": "P",
        "type": "single",
        "unit_id": unit_id,
        "variations": [{"default_sell_price": "1.0000"}],
    }

    first = await client.post("/api/v1/products", headers=owner_headers, json=body)
    second = await client.post("/api/v1/products", headers=owner_headers, json=body)

    assert first.json()["data"]["sku"] == "SKU0001"
    assert second.json()["data"]["sku"] == "SKU0002"


@pytest.mark.asyncio
async def test_duplicate_sku_conflicts(client: AsyncClient, owner_headers):
    unit_id = await _unit_id(client, owner_headers)
    body = {
        "name": "P",
        "type": "single",
        "unit_id": unit_id,
        "sku": "FIXED-1",
        "variations": [{"default_sell_price": "1.0000"}],
    }

    first = await client.post("/api/v1/products", headers=owner_headers, json=body)
    assert first.status_code == 201
    second = await client.post("/api/v1/products", headers=owner_headers, json=body)
    assert second.status_code == 409


@pytest.mark.asyncio
async def test_single_product_must_have_exactly_one_variation(
    client: AsyncClient, owner_headers
):
    unit_id = await _unit_id(client, owner_headers)

    resp = await client.post(
        "/api/v1/products",
        headers=owner_headers,
        json={
            "name": "Bad",
            "type": "single",
            "unit_id": unit_id,
            "variations": [
                {"default_sell_price": "1.0000"},
                {"default_sell_price": "2.0000"},
            ],
        },
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_negative_price_is_rejected(client: AsyncClient, owner_headers):
    unit_id = await _unit_id(client, owner_headers)

    resp = await client.post(
        "/api/v1/products",
        headers=owner_headers,
        json={
            "name": "Bad price",
            "type": "single",
            "unit_id": unit_id,
            "variations": [{"default_sell_price": "-1.0000"}],
        },
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_search_and_pagination(client: AsyncClient, owner_headers):
    unit_id = await _unit_id(client, owner_headers)
    for name in ("Espresso", "Latte", "Green Tea"):
        await client.post(
            "/api/v1/products",
            headers=owner_headers,
            json={
                "name": name,
                "type": "single",
                "unit_id": unit_id,
                "variations": [{"default_sell_price": "1.0000"}],
            },
        )

    # case-insensitive search (PG par ILIKE)
    resp = await client.get("/api/v1/products?q=espr", headers=owner_headers)
    assert [p["name"] for p in resp.json()["data"]] == ["Espresso"]

    # pagination meta
    page = await client.get("/api/v1/products?page=1&size=2", headers=owner_headers)
    body = page.json()
    assert len(body["data"]) == 2
    assert body["meta"] == {"total": 3, "page": 1, "size": 2, "pages": 2}


@pytest.mark.asyncio
async def test_update_and_soft_delete(client: AsyncClient, owner_headers):
    unit_id = await _unit_id(client, owner_headers)
    created = await client.post(
        "/api/v1/products",
        headers=owner_headers,
        json={
            "name": "Old name",
            "type": "single",
            "unit_id": unit_id,
            "variations": [{"default_sell_price": "1.0000"}],
        },
    )
    product_id = created.json()["data"]["id"]

    patched = await client.patch(
        f"/api/v1/products/{product_id}",
        headers=owner_headers,
        json={"name": "New name"},
    )
    assert patched.status_code == 200
    assert patched.json()["data"]["name"] == "New name"

    deleted = await client.delete(
        f"/api/v1/products/{product_id}", headers=owner_headers
    )
    assert deleted.status_code == 204

    # soft delete — list se ghayab
    listing = await client.get("/api/v1/products", headers=owner_headers)
    assert listing.json()["data"] == []
    gone = await client.get(f"/api/v1/products/{product_id}", headers=owner_headers)
    assert gone.status_code == 404


@pytest.mark.asyncio
async def test_cashier_role_cannot_create_product(client: AsyncClient):
    """Permission guard — Cashier ke paas sirf product.view hai."""
    from app.core.database import AsyncSessionLocal
    from app.core.security import hash_password
    from app.models.role import Permission, Role
    from app.models.user import User
    from sqlalchemy import select

    owner = await register_business(client)
    me = await client.get("/api/v1/auth/me", headers=owner)
    business_id = me.json()["data"]["business"]["id"]

    async with AsyncSessionLocal() as session:
        view_only = (
            await session.execute(
                select(Permission).where(Permission.name == "product.view")
            )
        ).scalar_one()

        role = Role(business_id=business_id, name="Cashier", is_admin=False)
        role.permissions = [view_only]
        session.add(role)
        await session.flush()

        session.add(
            User(
                business_id=business_id,
                role_id=role.id,
                email="cashier@test.local",
                hashed_password=hash_password("cashier12345"),
            )
        )
        await session.commit()

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "cashier@test.local", "password": "cashier12345"},
    )
    token = login.json()["data"]["access_token"]
    cashier = {"Authorization": f"Bearer {token}"}

    # view allowed
    assert (await client.get("/api/v1/products", headers=cashier)).status_code == 200

    # create forbidden
    unit_id = await _unit_id(client, owner)
    resp = await client.post(
        "/api/v1/products",
        headers=cashier,
        json={
            "name": "Nope",
            "type": "single",
            "unit_id": unit_id,
            "variations": [{"default_sell_price": "1.0000"}],
        },
    )
    assert resp.status_code == 403
