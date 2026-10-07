"""add secondary email to email operators

Revision ID: a2b6d9f3c7e1
Revises: f1c4a8e2d6b9
Create Date: 2026-08-04 06:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a2b6d9f3c7e1'
down_revision: Union[str, Sequence[str], None] = 'f1c4a8e2d6b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema (идемпотентно)."""

    connection = op.get_bind()
    inspector = sa.inspect(connection)

    existing_columns = {
        column["name"]
        for column in inspector.get_columns("email_operators")
    }

    if "secondary_email" not in existing_columns:
        op.add_column(
            "email_operators",
            sa.Column("secondary_email", sa.String(length=255), nullable=True)
        )


def downgrade() -> None:
    """Downgrade schema (идемпотентно)."""

    connection = op.get_bind()
    inspector = sa.inspect(connection)

    existing_columns = {
        column["name"]
        for column in inspector.get_columns("email_operators")
    }

    if "secondary_email" in existing_columns:
        op.drop_column("email_operators", "secondary_email")
