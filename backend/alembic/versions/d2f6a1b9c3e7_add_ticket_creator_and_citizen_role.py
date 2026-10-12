"""add ticket creator and citizen role

Revision ID: d2f6a1b9c3e7
Revises: c1a2b3d4e5f6
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "d2f6a1b9c3e7"
down_revision: Union[str, Sequence[str], None] = "c1a2b3d4e5f6"
branch_labels = None
depends_on = None

OLD_ROLE_NAME = "Наблюдатель"
NEW_ROLE_NAME = "Пользователь"
NEW_ROLE_DESCRIPTION = "Создаёт обращения и видит только свои"

FK_NAME = "fk_tickets_created_by_user_id_users"
INDEX_NAME = "ix_tickets_created_by_user_id"


def upgrade() -> None:
    connection = op.get_bind()

    inspector = sa.inspect(connection)
    columns = {
        col["name"] for col in inspector.get_columns("tickets")
    }

    if "created_by_user_id" not in columns:
        op.add_column(
            "tickets",
            sa.Column("created_by_user_id", sa.Integer(), nullable=True)
        )

    inspector = sa.inspect(connection)
    indexes = {
        idx["name"] for idx in inspector.get_indexes("tickets")
    }

    if INDEX_NAME not in indexes:
        op.create_index(
            INDEX_NAME,
            "tickets",
            ["created_by_user_id"],
            unique=False
        )

    inspector = sa.inspect(connection)
    foreign_keys = inspector.get_foreign_keys("tickets")

    has_fk = any(
        fk.get("referred_table") == "users"
        and fk.get("constrained_columns") == ["created_by_user_id"]
        for fk in foreign_keys
    )

    if not has_fk:
        with op.batch_alter_table("tickets") as batch_op:
            batch_op.create_foreign_key(
                FK_NAME,
                "users",
                ["created_by_user_id"],
                ["id"],
                ondelete="SET NULL"
            )

    roles = sa.table(
        "roles",
        sa.column("id", sa.Integer),
        sa.column("name", sa.String),
        sa.column("description", sa.String),
    )

    existing_old = connection.execute(
        sa.select(roles.c.id).where(roles.c.name == OLD_ROLE_NAME)
    ).first()

    existing_new = connection.execute(
        sa.select(roles.c.id).where(roles.c.name == NEW_ROLE_NAME)
    ).first()

    if existing_new is not None:
        pass
    elif existing_old is not None:
        connection.execute(
            roles.update()
            .where(roles.c.id == existing_old.id)
            .values(
                name=NEW_ROLE_NAME,
                description=NEW_ROLE_DESCRIPTION
            )
        )
    else:
        connection.execute(
            roles.insert().values(
                name=NEW_ROLE_NAME,
                description=NEW_ROLE_DESCRIPTION
            )
        )


def downgrade() -> None:
    connection = op.get_bind()

    roles = sa.table(
        "roles",
        sa.column("id", sa.Integer),
        sa.column("name", sa.String),
    )

    connection.execute(
        roles.update()
        .where(roles.c.name == NEW_ROLE_NAME)
        .values(name=OLD_ROLE_NAME)
    )

    inspector = sa.inspect(connection)
    foreign_keys = inspector.get_foreign_keys("tickets")

    matching_fk = next(
        (
            fk for fk in foreign_keys
            if fk.get("referred_table") == "users"
            and fk.get("constrained_columns") == ["created_by_user_id"]
        ),
        None
    )

    if matching_fk:
        with op.batch_alter_table(
            "tickets",
            naming_convention={
                "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s"
            }
        ) as batch_op:
            batch_op.drop_constraint(
                matching_fk.get("name") or FK_NAME,
                type_="foreignkey"
            )

    inspector = sa.inspect(connection)
    indexes = {
        idx["name"] for idx in inspector.get_indexes("tickets")
    }

    if INDEX_NAME in indexes:
        op.drop_index(INDEX_NAME, table_name="tickets")

    inspector = sa.inspect(connection)
    columns = {
        col["name"] for col in inspector.get_columns("tickets")
    }

    if "created_by_user_id" in columns:
        with op.batch_alter_table("tickets") as batch_op:
            batch_op.drop_column("created_by_user_id")