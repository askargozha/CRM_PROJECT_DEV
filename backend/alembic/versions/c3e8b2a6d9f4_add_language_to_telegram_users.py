"""add language to telegram users

Revision ID: c3e8b2a6d9f4
Revises: a2b6d9f3c7e1
Create Date: 2026-08-06 06:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3e8b2a6d9f4'
down_revision: Union[str, Sequence[str], None] = 'a2b6d9f3c7e1'
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

    if "language" not in existing_columns:
        op.add_column(
            "telegram_users",
            sa.Column(
                "language",
                sa.String(length=2),
                nullable=False,
                server_default="ru"
            )
        )


def downgrade() -> None:
    """Downgrade schema (идемпотентно)."""

    connection = op.get_bind()
    inspector = sa.inspect(connection)

    existing_columns = {
        column["name"]
        for column in inspector.get_columns("telegram_users")
    }

    if "language" in existing_columns:
        op.drop_column("telegram_users", "language")