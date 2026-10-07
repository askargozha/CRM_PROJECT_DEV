"""add telegram_chat_id to tickets

Revision ID: e5f1c7b3a9d2
Revises: c3e8b2a6d9f4
Create Date: 2026-08-07 06:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5f1c7b3a9d2'
down_revision: Union[str, Sequence[str], None] = 'c3e8b2a6d9f4'
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

    if "telegram_chat_id" not in existing_columns:
        op.add_column(
            "tickets",
            sa.Column("telegram_chat_id", sa.BigInteger(), nullable=True)
        )


def downgrade() -> None:
    """Downgrade schema (идемпотентно)."""

    connection = op.get_bind()
    inspector = sa.inspect(connection)

    existing_columns = {
        column["name"]
        for column in inspector.get_columns("tickets")
    }

    if "telegram_chat_id" in existing_columns:
        op.drop_column("tickets", "telegram_chat_id")
