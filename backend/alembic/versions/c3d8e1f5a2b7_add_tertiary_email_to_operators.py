"""add tertiary email to email operators

Третий (необязательный) адрес оператора рассылки — ещё одна копия
каждого письма, например руководителю.

Revision ID: c3d8e1f5a2b7
Revises: b7e2f4a91c38
Create Date: 2026-09-25 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d8e1f5a2b7'
down_revision: Union[str, Sequence[str], None] = 'b7e2f4a91c38'
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

    if "tertiary_email" not in existing_columns:
        op.add_column(
            "email_operators",
            sa.Column("tertiary_email", sa.String(length=255), nullable=True)
        )


def downgrade() -> None:
    """Downgrade schema (идемпотентно)."""

    connection = op.get_bind()
    inspector = sa.inspect(connection)

    existing_columns = {
        column["name"]
        for column in inspector.get_columns("email_operators")
    }

    if "tertiary_email" in existing_columns:
        op.drop_column("email_operators", "tertiary_email")
