"""add external_reference to tickets

Revision ID: b7e2f4a91c38
Revises: a3f8d0c2e751
Create Date: 2026-09-08 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7e2f4a91c38'
down_revision: Union[str, Sequence[str], None] = 'a3f8d0c2e751'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema (идемпотентно)."""

    connection = op.get_bind()
    inspector = sa.inspect(connection)

    existing_columns = {
        column["name"]
        for column in inspector.get_columns("tickets")
    }

    if "external_reference" not in existing_columns:
        op.add_column(
            "tickets",
            sa.Column(
                "external_reference",
                sa.String(length=100),
                nullable=True
            )
        )
        op.create_index(
            "ix_tickets_external_reference",
            "tickets",
            ["external_reference"],
            unique=True
        )


def downgrade() -> None:
    """Downgrade schema (идемпотентно)."""

    connection = op.get_bind()
    inspector = sa.inspect(connection)

    existing_columns = {
        column["name"]
        for column in inspector.get_columns("tickets")
    }

    if "external_reference" in existing_columns:
        op.drop_index("ix_tickets_external_reference", table_name="tickets")
        op.drop_column("tickets", "external_reference")
