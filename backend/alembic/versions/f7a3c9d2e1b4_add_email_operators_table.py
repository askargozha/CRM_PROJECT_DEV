"""add email_operators table and link to tickets

Revision ID: f7a3c9d2e1b4
Revises: e4f7b2a1d8c9
Create Date: 2026-07-29 07:00:00.000000

"""
import os
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from dotenv import load_dotenv


# revision identifiers, used by Alembic.
revision: str = 'f7a3c9d2e1b4'
down_revision: Union[str, Sequence[str], None] = 'e4f7b2a1d8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema (идемпотентно — проверяет, чего не хватает)."""

    connection = op.get_bind()
    inspector = sa.inspect(connection)

    if 'email_operators' not in inspector.get_table_names():

        op.create_table(
            'email_operators',
            sa.Column('id', sa.Integer(), primary_key=True, index=True),
            sa.Column('full_name', sa.String(length=255), nullable=False),
            sa.Column('email', sa.String(length=255), nullable=False, unique=True),
            sa.Column(
                'is_active',
                sa.Boolean(),
                nullable=False,
                server_default=sa.true()
            ),
            sa.Column(
                'created_at',
                sa.DateTime(),
                server_default=sa.func.now()
            ),
        )

    ticket_columns = [
        column["name"]
        for column in inspector.get_columns('tickets')
    ]

    if 'email_operator_id' not in ticket_columns:

        op.add_column(
            'tickets',
            sa.Column(
                'email_operator_id',
                sa.Integer(),
                sa.ForeignKey('email_operators.id', ondelete='SET NULL'),
                nullable=True
            )
        )

    # Переносим текущий список получателей из backend/.env (OPERATOR_EMAILS)
    # в новую таблицу, чтобы рассылка не осталась пустой после обновления.
    # Имя подставляется временно из части адреса до "@" — его можно
    # поменять на странице "Операторы рассылки" в любой момент.
    # ON CONFLICT DO NOTHING защищает от дублей при повторном запуске.
    load_dotenv()

    raw_emails = os.getenv("OPERATOR_EMAILS", "")
    emails = [e.strip() for e in raw_emails.split(",") if e.strip()]

    if emails:

        for email in emails:
            guessed_name = email.split("@")[0]

            connection.execute(
                sa.text(
                    "INSERT INTO email_operators (full_name, email, is_active) "
                    "VALUES (:full_name, :email, true) "
                    "ON CONFLICT (email) DO NOTHING"
                ),
                {"full_name": guessed_name, "email": email}
            )


def downgrade() -> None:
    """Downgrade schema (идемпотентно — не падает, если уже нет)."""

    connection = op.get_bind()
    inspector = sa.inspect(connection)

    ticket_columns = [
        column["name"]
        for column in inspector.get_columns('tickets')
    ]

    if 'email_operator_id' in ticket_columns:
        op.drop_column('tickets', 'email_operator_id')

    if 'email_operators' in inspector.get_table_names():
        op.drop_table('email_operators')
