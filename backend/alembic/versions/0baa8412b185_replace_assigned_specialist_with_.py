"""replace assigned specialist with assigned user

Revision ID: 0baa8412b185
Revises: a862e8608a45
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0baa8412b185"
down_revision: Union[str, Sequence[str], None] = "a862e8608a45"
branch_labels = None
depends_on = None

FK_NAME = "fk_tickets_assigned_user_id_users"
INDEX_NAME = "ix_tickets_assigned_user_id"


def upgrade() -> None:
    connection = op.get_bind()
    inspector = sa.inspect(connection)

    columns = {col["name"] for col in inspector.get_columns("tickets")}

    if "assigned_user_id" not in columns:
        op.add_column(
            "tickets",
            sa.Column("assigned_user_id", sa.Integer(), nullable=True)
        )

    inspector = sa.inspect(connection)
    indexes = {idx["name"] for idx in inspector.get_indexes("tickets")}

    if INDEX_NAME not in indexes:
        op.create_index(
            INDEX_NAME,
            "tickets",
            ["assigned_user_id"],
            unique=False
        )

    inspector = sa.inspect(connection)
    foreign_keys = inspector.get_foreign_keys("tickets")
    has_fk = any(
        fk.get("referred_table") == "users"
        and fk.get("constrained_columns") == ["assigned_user_id"]
        for fk in foreign_keys
    )

    if not has_fk:
        with op.batch_alter_table("tickets") as batch_op:
            batch_op.create_foreign_key(
                FK_NAME,
                "users",
                ["assigned_user_id"],
                ["id"],
                ondelete="SET NULL"
            )

    inspector = sa.inspect(connection)
    columns = {col["name"] for col in inspector.get_columns("tickets")}

    if "assigned_specialist" in columns:
        with op.batch_alter_table("tickets") as batch_op:
            batch_op.drop_column("assigned_specialist")


def downgrade() -> None:
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    columns = {col["name"] for col in inspector.get_columns("tickets")}

    if "assigned_specialist" not in columns:
        op.add_column(
            "tickets",
            sa.Column("assigned_specialist", sa.String(255), nullable=True)
        )

    inspector = sa.inspect(connection)
    foreign_keys = inspector.get_foreign_keys("tickets")
    fk_names = [
        fk.get("name")
        for fk in foreign_keys
        if fk.get("referred_table") == "users"
        and fk.get("constrained_columns") == ["assigned_user_id"]
    ]

    if fk_names:
        with op.batch_alter_table(
            "tickets",
            naming_convention={
                "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s"
            }
        ) as batch_op:
            for name in fk_names:
                batch_op.drop_constraint(
                    name or FK_NAME,
                    type_="foreignkey"
                )

    inspector = sa.inspect(connection)
    indexes = {idx["name"] for idx in inspector.get_indexes("tickets")}
    if INDEX_NAME in indexes:
        op.drop_index(INDEX_NAME, table_name="tickets")

    inspector = sa.inspect(connection)
    columns = {col["name"] for col in inspector.get_columns("tickets")}
    if "assigned_user_id" in columns:
        with op.batch_alter_table("tickets") as batch_op:
            batch_op.drop_column("assigned_user_id")