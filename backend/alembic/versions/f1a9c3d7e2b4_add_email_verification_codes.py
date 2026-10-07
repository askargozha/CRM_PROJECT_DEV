"""add email verification codes for registration

Revision ID: f1a9c3d7e2b4
Revises: f7a3c9d2e1b4
Create Date: 2026-07-29 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1a9c3d7e2b4'
down_revision: Union[str, Sequence[str], None] = 'f7a3c9d2e1b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema (идемпотентно — проверяет, чего не хватает)."""

    connection = op.get_bind()
    inspector = sa.inspect(connection)

    if 'email_verification_codes' in inspector.get_table_names():
        return

    op.create_table(
        'email_verification_codes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('code', sa.String(length=6), nullable=False),
        sa.Column('attempts', sa.Integer(), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(
        op.f('ix_email_verification_codes_id'),
        'email_verification_codes',
        ['id'],
        unique=False
    )
    op.create_index(
        op.f('ix_email_verification_codes_email'),
        'email_verification_codes',
        ['email'],
        unique=True
    )


def downgrade() -> None:
    """Downgrade schema (идемпотентно — не падает, если уже нет)."""

    connection = op.get_bind()
    inspector = sa.inspect(connection)

    if 'email_verification_codes' not in inspector.get_table_names():
        return

    op.drop_index(
        op.f('ix_email_verification_codes_email'),
        table_name='email_verification_codes'
    )
    op.drop_index(
        op.f('ix_email_verification_codes_id'),
        table_name='email_verification_codes'
    )
    op.drop_table('email_verification_codes')
