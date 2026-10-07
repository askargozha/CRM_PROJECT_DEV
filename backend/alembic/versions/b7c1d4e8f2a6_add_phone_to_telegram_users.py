"""add phone to telegram users

Revision ID: b7c1d4e8f2a6
Revises: a3f8b2c7d1e9
Create Date: 2026-07-29 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7c1d4e8f2a6'
down_revision: Union[str, Sequence[str], None] = 'a3f8b2c7d1e9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    existing_columns = {
        column['name']
        for column in inspector.get_columns('telegram_users')
    }

    if 'phone' not in existing_columns:
        op.add_column(
            'telegram_users',
            sa.Column('phone', sa.String(length=30), nullable=True)
        )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('telegram_users', 'phone')
