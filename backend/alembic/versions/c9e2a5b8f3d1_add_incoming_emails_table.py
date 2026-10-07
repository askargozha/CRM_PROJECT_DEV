"""add incoming emails table

Revision ID: c9e2a5b8f3d1
Revises: c9d3e7f1a5b8
Create Date: 2026-07-30 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c9e2a5b8f3d1'
down_revision: Union[str, Sequence[str], None] = 'c9d3e7f1a5b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    if 'incoming_emails' not in existing_tables:
        op.create_table(
            'incoming_emails',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('message_id', sa.String(length=998), nullable=False),
            sa.Column('from_address', sa.String(length=255), nullable=False),
            sa.Column('subject', sa.String(length=998), nullable=False),
            sa.Column('body', sa.Text(), nullable=False),
            sa.Column('received_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('is_read', sa.Boolean(), nullable=False),
            sa.Column('ticket_id', sa.Integer(), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(
                ['ticket_id'],
                ['tickets.id'],
                ondelete='SET NULL'
            )
        )
        existing_indexes = set()
    else:
        existing_indexes = {
            index['name'] for index in inspector.get_indexes('incoming_emails')
        }

    if 'ix_incoming_emails_id' not in existing_indexes:
        op.create_index(
            op.f('ix_incoming_emails_id'),
            'incoming_emails',
            ['id'],
            unique=False
        )

    if 'ix_incoming_emails_message_id' not in existing_indexes:
        op.create_index(
            op.f('ix_incoming_emails_message_id'),
            'incoming_emails',
            ['message_id'],
            unique=True
        )

    if 'ix_incoming_emails_ticket_id' not in existing_indexes:
        op.create_index(
            op.f('ix_incoming_emails_ticket_id'),
            'incoming_emails',
            ['ticket_id'],
            unique=False
        )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        op.f('ix_incoming_emails_ticket_id'),
        table_name='incoming_emails'
    )
    op.drop_index(
        op.f('ix_incoming_emails_message_id'),
        table_name='incoming_emails'
    )
    op.drop_index(
        op.f('ix_incoming_emails_id'),
        table_name='incoming_emails'
    )
    op.drop_table('incoming_emails')
