"""add email notification status to tickets

Revision ID: e4f7b2a1d8c9
Revises: d2f6a1b9c3e7
Create Date: 2026-07-28 08:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e4f7b2a1d8c9'
down_revision: Union[str, Sequence[str], None] = 'd2f6a1b9c3e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema (идемпотентно)."""

    connection = op.get_bind()
    inspector = sa.inspect(connection)
    existing_columns = {
        column["name"]
        for column in inspector.get_columns('tickets')
    }

    if 'email_sent' not in existing_columns:
        op.add_column(
            'tickets',
            sa.Column(
                'email_sent',
                sa.Boolean(),
                nullable=False,
                server_default=sa.false()
            )
        )

    if 'email_recipient' not in existing_columns:
        op.add_column(
            'tickets',
            sa.Column('email_recipient', sa.String(length=255), nullable=True)
        )

    if 'email_error' not in existing_columns:
        op.add_column(
            'tickets',
            sa.Column('email_error', sa.Text(), nullable=True)
        )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('tickets', 'email_error')
    op.drop_column('tickets', 'email_recipient')
    op.drop_column('tickets', 'email_sent')
