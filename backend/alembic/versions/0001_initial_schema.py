"""initial schema — business, roles, users, products

Revision ID: 0001
Revises:
Create Date: 2026-07-23 00:00:00

Tarteeb ahem hai — FK target table pehle banni chahiye:

    business -> permissions -> roles -> role_permissions -> users
             -> categories / brands / units -> products -> product_variations
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Paisa/quantity hamesha Numeric(22, 4) — dekho app/db/mixins.py
MONEY = sa.Numeric(22, 4)


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    ]


def _audit() -> list[sa.Column]:
    return [
        sa.Column("created_by", sa.BigInteger(), nullable=True),
        sa.Column("updated_by", sa.BigInteger(), nullable=True),
    ]


def upgrade() -> None:
    # ------------------------------------------------------------------ #
    # business
    # ------------------------------------------------------------------ #
    op.create_table(
        "business",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column(
            "currency_code", sa.String(8), server_default="USD", nullable=False
        ),
        sa.Column("sku_prefix", sa.String(32), nullable=True),
        sa.Column(
            "is_active", sa.Boolean(), server_default=sa.true(), nullable=False
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        *_timestamps(),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_business_deleted_at", "business", ["deleted_at"])

    op.create_table(
        "business_locations",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("business_id", sa.BigInteger(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column(
            "is_active", sa.Boolean(), server_default=sa.true(), nullable=False
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(["business_id"], ["business.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_business_locations_business_id", "business_locations", ["business_id"]
    )
    op.create_index(
        "ix_business_locations_deleted_at", "business_locations", ["deleted_at"]
    )

    # ------------------------------------------------------------------ #
    # permissions / roles
    # ------------------------------------------------------------------ #
    op.create_table(
        "permissions",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.String(255), nullable=True),
        *_timestamps(),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_permissions_name", "permissions", ["name"], unique=True)

    op.create_table(
        "roles",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("business_id", sa.BigInteger(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column(
            "is_admin", sa.Boolean(), server_default=sa.false(), nullable=False
        ),
        *_timestamps(),
        sa.ForeignKeyConstraint(["business_id"], ["business.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("business_id", "name", name="uq_roles_business_name"),
    )
    op.create_index("ix_roles_business_id", "roles", ["business_id"])

    op.create_table(
        "role_permissions",
        sa.Column("role_id", sa.BigInteger(), nullable=False),
        sa.Column("permission_id", sa.BigInteger(), nullable=False),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["permission_id"], ["permissions.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("role_id", "permission_id"),
    )

    # ------------------------------------------------------------------ #
    # users
    # ------------------------------------------------------------------ #
    op.create_table(
        "users",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=True),
        sa.Column("avatar_url", sa.String(512), nullable=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column(
            "is_active", sa.Boolean(), server_default=sa.true(), nullable=False
        ),
        # pehla (owner) user banne ke waqt business abhi nahi hoti -> nullable
        sa.Column("business_id", sa.BigInteger(), nullable=True),
        sa.Column("role_id", sa.BigInteger(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(["business_id"], ["business.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_business_id", "users", ["business_id"])
    op.create_index("ix_users_deleted_at", "users", ["deleted_at"])

    # ------------------------------------------------------------------ #
    # product lookups
    # ------------------------------------------------------------------ #
    for table in ("categories", "brands", "units"):
        extra: list[sa.Column] = []
        if table == "categories":
            extra = [
                sa.Column("short_code", sa.String(32), nullable=True),
                sa.Column("parent_id", sa.BigInteger(), nullable=True),
            ]
        elif table == "brands":
            extra = [sa.Column("description", sa.Text(), nullable=True)]
        else:  # units
            extra = [
                sa.Column("short_name", sa.String(32), nullable=False),
                sa.Column(
                    "allow_decimal",
                    sa.Boolean(),
                    server_default=sa.false(),
                    nullable=False,
                ),
            ]

        constraints: list = [
            sa.ForeignKeyConstraint(
                ["business_id"], ["business.id"], ondelete="CASCADE"
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "business_id", "name", name=f"uq_{table}_business_name"
            ),
        ]
        if table == "categories":
            constraints.append(
                sa.ForeignKeyConstraint(
                    ["parent_id"], ["categories.id"], ondelete="SET NULL"
                )
            )

        op.create_table(
            table,
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("business_id", sa.BigInteger(), nullable=False),
            sa.Column("name", sa.String(255), nullable=False),
            *extra,
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            *_timestamps(),
            *_audit(),
            *constraints,
        )
        op.create_index(f"ix_{table}_business_id", table, ["business_id"])
        op.create_index(f"ix_{table}_deleted_at", table, ["deleted_at"])
        op.create_index(f"ix_{table}_created_by", table, ["created_by"])

    # ------------------------------------------------------------------ #
    # products
    # ------------------------------------------------------------------ #
    op.create_table(
        "products",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("business_id", sa.BigInteger(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("type", sa.String(16), server_default="single", nullable=False),
        sa.Column("sku", sa.String(64), nullable=False),
        sa.Column(
            "barcode_type", sa.String(16), server_default="C128", nullable=False
        ),
        sa.Column("unit_id", sa.BigInteger(), nullable=False),
        sa.Column("category_id", sa.BigInteger(), nullable=True),
        sa.Column("brand_id", sa.BigInteger(), nullable=True),
        sa.Column(
            "enable_stock", sa.Boolean(), server_default=sa.true(), nullable=False
        ),
        sa.Column("alert_quantity", MONEY, nullable=True),
        sa.Column("image_url", sa.String(512), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "is_inactive", sa.Boolean(), server_default=sa.false(), nullable=False
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        *_timestamps(),
        *_audit(),
        sa.ForeignKeyConstraint(["business_id"], ["business.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["unit_id"], ["units.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(
            ["category_id"], ["categories.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(["brand_id"], ["brands.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("business_id", "sku", name="uq_products_business_sku"),
        # PG mein MySQL wala `enum` nahi — VARCHAR + CheckConstraint
        sa.CheckConstraint(
            "type IN ('single', 'variable', 'combo')", name="ck_products_type"
        ),
        # PG mein `unsigned` nahi hota
        sa.CheckConstraint(
            "alert_quantity IS NULL OR alert_quantity >= 0",
            name="ck_products_alert_quantity_non_negative",
        ),
    )
    op.create_index("ix_products_business_id", "products", ["business_id"])
    op.create_index("ix_products_sku", "products", ["sku"])
    op.create_index("ix_products_deleted_at", "products", ["deleted_at"])
    op.create_index("ix_products_created_by", "products", ["created_by"])
    op.create_index("ix_products_business_name", "products", ["business_id", "name"])

    op.create_table(
        "product_variations",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("product_id", sa.BigInteger(), nullable=False),
        sa.Column("name", sa.String(255), server_default="DUMMY", nullable=False),
        sa.Column("sub_sku", sa.String(64), nullable=False),
        sa.Column(
            "default_purchase_price", MONEY, server_default="0", nullable=False
        ),
        sa.Column("default_sell_price", MONEY, server_default="0", nullable=False),
        sa.Column("profit_percent", MONEY, server_default="0", nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        *_timestamps(),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "product_id", "sub_sku", name="uq_variations_product_sub_sku"
        ),
        sa.CheckConstraint(
            "default_purchase_price >= 0",
            name="ck_variations_purchase_price_non_negative",
        ),
        sa.CheckConstraint(
            "default_sell_price >= 0", name="ck_variations_sell_price_non_negative"
        ),
    )
    op.create_index(
        "ix_product_variations_product_id", "product_variations", ["product_id"]
    )
    op.create_index("ix_product_variations_sub_sku", "product_variations", ["sub_sku"])
    op.create_index(
        "ix_product_variations_deleted_at", "product_variations", ["deleted_at"]
    )


def downgrade() -> None:
    # ULTI tarteeb — child pehle
    op.drop_table("product_variations")
    op.drop_table("products")
    for table in ("units", "brands", "categories"):
        op.drop_table(table)
    op.drop_table("users")
    op.drop_table("role_permissions")
    op.drop_table("roles")
    op.drop_table("permissions")
    op.drop_table("business_locations")
    op.drop_table("business")
