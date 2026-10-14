"""add before and after values to ticket history

Revision ID: 59e3a5f1e13b
Revises: c9c39546a65e
Create Date: 2026-10-12 11:43:09.190962

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '59e3a5f1e13b'
down_revision: Union[str, Sequence[str], None] = 'c9c39546a65e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add before and after values to ticket history."""
    op.add_column(
        "ticket_history",
        sa.Column("before_value", sa.Text(), nullable=True),
    )
    op.add_column(
        "ticket_history",
        sa.Column("after_value", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    """Remove before and after values from ticket history."""
    op.drop_column("ticket_history", "after_value")
    op.drop_column("ticket_history", "before_value")
