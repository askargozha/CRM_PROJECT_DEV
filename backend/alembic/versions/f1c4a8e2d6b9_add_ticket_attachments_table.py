"""add ticket attachments table

Revision ID: f1c4a8e2d6b9
Revises: e7b3c1d9f4a2
Create Date: 2026-08-03 06:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1c4a8e2d6b9'
down_revision: Union[str, Sequence[str], None] = 'e7b3c1d9f4a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema (идемпотентно)."""

    connection = op.get_bind()
    inspector = sa.inspect(connection)

    if 'ticket_attachments' in inspector.get_table_names():
        return

    op.create_table(
        'ticket_attachments',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column(
            'ticket_id',
            sa.Integer(),
            sa.ForeignKey('tickets.id', ondelete='CASCADE'),
            nullable=False,
            index=True
        ),
        sa.Column('file_path', sa.String(length=255), nullable=False),
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

    if 'ticket_attachments' in inspector.get_table_names():
        op.drop_table('ticket_attachments')
