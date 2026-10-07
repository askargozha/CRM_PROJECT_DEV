"""add brute-force protection fields to users

Revision ID: e7b3c1d9f4a2
Revises: d4f8a2c6b9e3
Create Date: 2026-08-02 06:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e7b3c1d9f4a2'
down_revision: Union[str, Sequence[str], None] = 'd4f8a2c6b9e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema (идемпотентно)."""

    connection = op.get_bind()
    inspector = sa.inspect(connection)

    existing_columns = {
        column["name"]
        for column in inspector.get_columns("users")
    }

    if "failed_login_attempts" not in existing_columns:
        op.add_column(
            "users",
            sa.Column(
                "failed_login_attempts",
                sa.Integer(),
                nullable=False,
                server_default="0"
            )
        )

    if "locked_until" not in existing_columns:
        op.add_column(
            "users",
            sa.Column("locked_until", sa.DateTime(), nullable=True)
        )


def downgrade() -> None:
    """Downgrade schema (идемпотентно)."""

    connection = op.get_bind()
    inspector = sa.inspect(connection)

    existing_columns = {
        column["name"]
        for column in inspector.get_columns("users")
    }

    if "locked_until" in existing_columns:
        op.drop_column("users", "locked_until")

    if "failed_login_attempts" in existing_columns:
        op.drop_column("users", "failed_login_attempts")
