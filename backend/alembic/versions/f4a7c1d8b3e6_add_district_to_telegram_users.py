"""add district to telegram users

Revision ID: f4a7c1d8b3e6
Revises: e5f1c7b3a9d2
Create Date: 2026-08-14 06:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f4a7c1d8b3e6'
down_revision: Union[str, Sequence[str], None] = 'e5f1c7b3a9d2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema (идемпотентно)."""

    connection = op.get_bind()
    inspector = sa.inspect(connection)

    existing_columns = {
        column["name"]
        for column in inspector.get_columns("telegram_users")
    }

    if "district" not in existing_columns:
        op.add_column(
            "telegram_users",
            sa.Column("district", sa.String(length=100), nullable=True)
        )


def downgrade() -> None:
    """Downgrade schema (идемпотентно)."""

    connection = op.get_bind()
    inspector = sa.inspect(connection)

    existing_columns = {
        column["name"]
        for column in inspector.get_columns("telegram_users")
    }

    if "district" in existing_columns:
        op.drop_column("telegram_users", "district")
