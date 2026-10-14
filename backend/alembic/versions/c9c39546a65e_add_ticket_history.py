
"""add ticket history

Revision ID: c9c39546a65e
Revises: c3d8e1f5a2b7
Create Date: 2026-10-12 09:37:21.938238
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c9c39546a65e"
down_revision: Union[str, Sequence[str], None] = "c3d8e1f5a2b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the ticket history table."""
    op.create_table(
        "ticket_history",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ticket_id", sa.Integer(), nullable=True), # Сохраняем историю после удаления обращения, отвязывая её от tickets.
        sa.Column("ticket_reference", sa.Integer(), nullable=False), # Исходный ID обращения сохраняется даже после удаления записи tickets.
        sa.Column("actor_user_id", sa.Integer(), nullable=True),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=False),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["actor_user_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["ticket_id"],
            ["tickets.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_ticket_history_id",
        "ticket_history",
        ["id"],
        unique=False,
    )
    op.create_index(
        "ix_ticket_history_ticket_created",
        "ticket_history",
        ["ticket_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_ticket_history_ticket_id",
        "ticket_history",
        ["ticket_id"],
        unique=False,
    )
    op.create_index(
        "ix_ticket_history_ticket_reference",
        "ticket_history",
        ["ticket_reference"],
        unique=False,
    )


def downgrade() -> None:
    """Drop the ticket history table."""
    op.drop_index(
        "ix_ticket_history_ticket_reference",
        table_name="ticket_history",
    )
    op.drop_index("ix_ticket_history_ticket_id", table_name="ticket_history")
    op.drop_index(
        "ix_ticket_history_ticket_created",
        table_name="ticket_history",
    )
    op.drop_index("ix_ticket_history_id", table_name="ticket_history")
    op.drop_table("ticket_history")