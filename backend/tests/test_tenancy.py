"""Tenant isolation — sabse ahem tests.

Agar ye fail hon to ek business ka data doosre ko dikh raha hai.
"""

import pytest
from httpx import AsyncClient

from tests.conftest import register_business


async def _create_unit_and_product(
    client: AsyncClient, headers: dict[str, str], *, name: str
) -> dict:
    """Product banane ke liye unit chahiye; seeder ke baghair khud banate hain."""
    from app.core.database import AsyncSessionLocal
    from app.models.product import Unit

    # business_id token se milta hai; yahan seedha DB mein unit daal dete hain
    me = await client.get("/api/v1/auth/me", headers=headers)
    business_id = me.json()["data"]["business"]["id"]

    async with AsyncSessionLocal() as session:
        unit = Unit(business_id=business_id, name=f"Pieces {business_id}", short_name="Pc")
        session.add(unit)
        await session.commit()
        unit_id = unit.id

    resp = await client.post(
        "/api/v1/products",
        headers=headers,
        json={
            "name": name,
            "type": "single",
            "unit_id": unit_id,
            "variations": [{"default_sell_price": "9.9900"}],
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]


@pytest.mark.asyncio
async def test_products_are_isolated_between_businesses(client: AsyncClient):
    store_a = await register_business(
        client, business_name="Store A", email="a@test.local"
    )
    store_b = await register_business(
        client, business_name="Store B", email="b@test.local"
    )

    await _create_unit_and_product(client, store_a, name="A Product")
    await _create_unit_and_product(client, store_b, name="B Product")

    resp_a = await client.get("/api/v1/products", headers=store_a)
    names_a = [p["name"] for p in resp_a.json()["data"]]
    assert names_a == ["A Product"]

    resp_b = await client.get("/api/v1/products", headers=store_b)
    names_b = [p["name"] for p in resp_b.json()["data"]]
    assert names_b == ["B Product"]


@pytest.mark.asyncio
async def test_cannot_read_another_business_product_by_id(client: AsyncClient):
    store_a = await register_business(
        client, business_name="Store A", email="a@test.local"
    )
    store_b = await register_business(
        client, business_name="Store B", email="b@test.local"
    )

    product_a = await _create_unit_and_product(client, store_a, name="A Product")

    # B, A ki id se maangta hai -> 404 (403 nahi, warna id ka wujood leak hota)
    resp = await client.get(f"/api/v1/products/{product_a['id']}", headers=store_b)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_cannot_delete_another_business_product(client: AsyncClient):
    store_a = await register_business(
        client, business_name="Store A", email="a@test.local"
    )
    store_b = await register_business(
        client, business_name="Store B", email="b@test.local"
    )
    product_a = await _create_unit_and_product(client, store_a, name="A Product")

    resp = await client.delete(f"/api/v1/products/{product_a['id']}", headers=store_b)
    assert resp.status_code == 404

    # A ke paas abhi bhi maujood hona chahiye
    still_there = await client.get(
        f"/api/v1/products/{product_a['id']}", headers=store_a
    )
    assert still_there.status_code == 200


@pytest.mark.asyncio
async def test_users_are_isolated_between_businesses(client: AsyncClient):
    store_a = await register_business(
        client, business_name="Store A", email="a@test.local"
    )
    store_b = await register_business(
        client, business_name="Store B", email="b@test.local"
    )

    resp_a = await client.get("/api/v1/users", headers=store_a)
    emails_a = [u["email"] for u in resp_a.json()["data"]]
    assert emails_a == ["a@test.local"]

    resp_b = await client.get("/api/v1/users", headers=store_b)
    emails_b = [u["email"] for u in resp_b.json()["data"]]
    assert emails_b == ["b@test.local"]


@pytest.mark.asyncio
async def test_business_endpoint_returns_only_own_business(client: AsyncClient):
    store_a = await register_business(
        client, business_name="Store A", email="a@test.local"
    )
    await register_business(client, business_name="Store B", email="b@test.local")

    resp = await client.get("/api/v1/business", headers=store_a)
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert data["name"] == "Store A"
    # register ne ek default location banayi thi (relationship nested aati hai)
    assert [loc["name"] for loc in data["locations"]] == ["Main Location"]
