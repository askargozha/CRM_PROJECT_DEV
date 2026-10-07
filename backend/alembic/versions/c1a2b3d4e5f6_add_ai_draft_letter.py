"""add ai_draft_letter to tickets

Revision ID: c1a2b3d4e5f6
Revises: 0baa8412b185
Create Date: 2026-07-24 09:29:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1a2b3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '0baa8412b185'
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

    if 'ai_draft_letter' not in existing_columns:
        op.add_column(
            'tickets',
            sa.Column('ai_draft_letter', sa.Text(), nullable=True)
        )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('tickets', 'ai_draft_letter')
