"""add email_operators table and link to tickets

Revision ID: f7a3c9d2e1b4
Revises: e4f7b2a1d8c9
"""

import os
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from dotenv import load_dotenv

revision: str = "f7a3c9d2e1b4"
down_revision: Union[str, Sequence[str], None] = "e4f7b2a1d8c9"
branch_labels = None
depends_on = None

FK_NAME = "fk_tickets_email_operator_id_email_operators"


def upgrade() -> None:
    connection = op.get_bind()
    inspector = sa.inspect(connection)

    if "email_operators" not in inspector.get_table_names():
        op.create_table(
            "email_operators",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("full_name", sa.String(255), nullable=False),
            sa.Column("email", sa.String(255), nullable=False, unique=True),
            sa.Column(
                "is_active",
                sa.Boolean(),
                nullable=False,
                server_default=sa.true()
            ),
            sa.Column(
                "created_at",
                sa.DateTime(),
                server_default=sa.func.now()
            ),
        )

    inspector = sa.inspect(connection)
    ticket_columns = {
        col["name"] for col in inspector.get_columns("tickets")
    }

    if "email_operator_id" not in ticket_columns:
        op.add_column(
            "tickets",
            sa.Column(
                "email_operator_id",
                sa.Integer(),
                nullable=True
            )
        )

    inspector = sa.inspect(connection)
    foreign_keys = inspector.get_foreign_keys("tickets")

    has_fk = any(
        fk.get("referred_table") == "email_operators"
        and fk.get("constrained_columns") == ["email_operator_id"]
        for fk in foreign_keys
    )

    if not has_fk:
        with op.batch_alter_table("tickets") as batch_op:
            batch_op.create_foreign_key(
                FK_NAME,
                "email_operators",
                ["email_operator_id"],
                ["id"],
                ondelete="SET NULL"
            )

    load_dotenv()

    raw_emails = os.getenv("OPERATOR_EMAILS", "")
    emails = [
        email.strip()
        for email in raw_emails.split(",")
        if email.strip()
    ]

    for email in emails:
        guessed_name = email.split("@")[0]

        connection.execute(
            sa.text(
                "INSERT INTO email_operators "
                "(full_name, email, is_active) "
                "VALUES (:full_name, :email, true) "
                "ON CONFLICT (email) DO NOTHING"
            ),
            {
                "full_name": guessed_name,
                "email": email
            }
        )


def downgrade() -> None:
    connection = op.get_bind()
    inspector = sa.inspect(connection)

    if "email_operator_id" in {
        col["name"] for col in inspector.get_columns("tickets")
    }:
        with op.batch_alter_table(
            "tickets",
            naming_convention={
                "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s"
            }
        ) as batch_op:
            batch_op.drop_column("email_operator_id")

    inspector = sa.inspect(connection)

    if "email_operators" in inspector.get_table_names():
        op.drop_table("email_operators")