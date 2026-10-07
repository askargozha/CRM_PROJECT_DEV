"""add telegram users table

Revision ID: a3f8b2c7d1e9
Revises: f1a9c3d7e2b4
Create Date: 2026-07-29 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3f8b2c7d1e9'
down_revision: Union[str, Sequence[str], None] = 'f1a9c3d7e2b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    if 'telegram_users' not in existing_tables:
        op.create_table(
            'telegram_users',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('chat_id', sa.BigInteger(), nullable=False),
            sa.Column('full_name', sa.String(length=255), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )

        existing_indexes = set()
    else:
        existing_indexes = {
            index['name'] for index in inspector.get_indexes('telegram_users')
        }

    if 'ix_telegram_users_id' not in existing_indexes:
        op.create_index(
            op.f('ix_telegram_users_id'),
            'telegram_users',
            ['id'],
            unique=False
        )

    if 'ix_telegram_users_chat_id' not in existing_indexes:
        op.create_index(
            op.f('ix_telegram_users_chat_id'),
            'telegram_users',
            ['chat_id'],
            unique=True
        )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        op.f('ix_telegram_users_chat_id'),
        table_name='telegram_users'
    )
    op.drop_index(
        op.f('ix_telegram_users_id'),
        table_name='telegram_users'
    )
    op.drop_table('telegram_users')
