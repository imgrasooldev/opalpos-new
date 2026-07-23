"""Database seeder runner.

Usage:
    python -m app.db.seed

Register new seeders in the SEEDERS list below. Seeders are idempotent,
so running this multiple times is safe.
"""

import asyncio

from app.core.database import AsyncSessionLocal, init_db
from app.db.seeders.base import BaseSeeder
from app.db.seeders.demo_seeder import DemoSeeder

SEEDERS: list[BaseSeeder] = [
    DemoSeeder(),
]


async def run_seeders() -> None:
    # Ensure tables exist for zero-config dev. If you use Alembic, run
    # `alembic upgrade head` first; this call is then a harmless no-op.
    await init_db()

    async with AsyncSessionLocal() as session:
        for seeder in SEEDERS:
            print(f"  - seeding: {seeder.name}")
            await seeder.run(session)
        await session.commit()

    print("Seeding complete.")
    print("Login: owner@demo.test / owner12345  (Owner, all permissions)")
    print("       cashier@demo.test / cashier12345  (Cashier, product.view only)")


if __name__ == "__main__":
    asyncio.run(run_seeders())
