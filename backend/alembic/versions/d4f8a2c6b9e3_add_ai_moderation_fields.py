"""add ai moderation fields to tickets

Revision ID: d4f8a2c6b9e3
Revises: c9e2a5b8f3d1
Create Date: 2026-08-01 06:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4f8a2c6b9e3'
down_revision: Union[str, Sequence[str], None] = 'c9e2a5b8f3d1'
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

    if "ai_is_meaningful" not in existing_columns:
        op.add_column(
            "tickets",
            sa.Column("ai_is_meaningful", sa.Boolean(), nullable=True)
        )

    if "ai_contains_profanity" not in existing_columns:
        op.add_column(
            "tickets",
            sa.Column("ai_contains_profanity", sa.Boolean(), nullable=True)
        )

    if "ai_moderation_reason" not in existing_columns:
        op.add_column(
            "tickets",
            sa.Column("ai_moderation_reason", sa.Text(), nullable=True)
        )


def downgrade() -> None:
    """Downgrade schema (идемпотентно)."""

    connection = op.get_bind()
    inspector = sa.inspect(connection)

    existing_columns = {
        column["name"]
        for column in inspector.get_columns("tickets")
    }

    if "ai_moderation_reason" in existing_columns:
        op.drop_column("tickets", "ai_moderation_reason")

    if "ai_contains_profanity" in existing_columns:
        op.drop_column("tickets", "ai_contains_profanity")

    if "ai_is_meaningful" in existing_columns:
        op.drop_column("tickets", "ai_is_meaningful")
