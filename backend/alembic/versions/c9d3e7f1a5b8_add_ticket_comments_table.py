"""add ticket comments table

Revision ID: c9d3e7f1a5b8
Revises: b7c1d4e8f2a6
Create Date: 2026-07-31 06:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c9d3e7f1a5b8'
down_revision: Union[str, Sequence[str], None] = 'b7c1d4e8f2a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema (идемпотентно)."""

    connection = op.get_bind()
    inspector = sa.inspect(connection)

    if 'ticket_comments' in inspector.get_table_names():
        return

    op.create_table(
        'ticket_comments',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column(
            'ticket_id',
            sa.Integer(),
            sa.ForeignKey('tickets.id', ondelete='CASCADE'),
            nullable=False,
            index=True
        ),
        sa.Column(
            'author_user_id',
            sa.Integer(),
            sa.ForeignKey('users.id', ondelete='CASCADE'),
            nullable=False
        ),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column(
            'created_at',
            sa.DateTime(),
            server_default=sa.func.now()
        ),
    )


def downgrade() -> None:
    """Downgrade schema (идемпотентно)."""

    connection = op.get_bind()
    inspector = sa.inspect(connection)

    if 'ticket_comments' in inspector.get_table_names():
        op.drop_table('ticket_comments')
