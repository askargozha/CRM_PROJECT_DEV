"""baseline existing tickets

Revision ID: b81aa21cb569
Revises: 
Create Date: 2026-07-16 14:32:56.475476

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b81aa21cb569'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Upgrade schema (идемпотентно).

    Изначально эта миграция была пустой заглушкой ("baseline") —
    таблица "tickets" на тот момент уже существовала в базе (создана
    напрямую из моделей, в обход Alembic). На полностью новой базе
    (например, при первом запуске в Docker) такой таблицы никогда не
    было — теперь миграция сама создаёт её, если её ещё нет. Поля,
    которые появились позже (assigned_user_id, email_operator_id и
    т.п. — они ссылаются на таблицы, которые появляются только в
    следующих миграциях), сюда сознательно не включены — их по
    прежнему добавляют те миграции, что добавляли их и раньше.
    """

    connection = op.get_bind()
    inspector = sa.inspect(connection)

    if 'tickets' in inspector.get_table_names():
        return

    op.create_table(
        'tickets',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('applicant', sa.String(length=255), nullable=False),
        sa.Column('phone', sa.String(length=30), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column(
            'source',
            sa.String(length=50),
            nullable=False,
            server_default="Веб-форма"
        ),
        sa.Column('district', sa.String(length=150), nullable=True),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('operator', sa.String(length=100), nullable=True),
        sa.Column(
            'priority',
            sa.String(length=50),
            nullable=False,
            server_default="Средний"
        ),
        sa.Column(
            'status',
            sa.String(length=50),
            nullable=False,
            server_default="Новое"
        ),
        sa.Column('deadline', sa.DateTime(), nullable=True),
        sa.Column('ai_category', sa.String(length=100), nullable=True),
        sa.Column('ai_operator', sa.String(length=100), nullable=True),
        sa.Column('ai_priority', sa.String(length=50), nullable=True),
        sa.Column('ai_summary', sa.Text(), nullable=True),
        sa.Column('ai_confidence', sa.Float(), nullable=True),
        sa.Column(
            'ai_processed',
            sa.Boolean(),
            nullable=False,
            server_default=sa.false()
        ),
        sa.Column(
            'created_date',
            sa.Date(),
            nullable=False,
            server_default=sa.func.current_date()
        ),
        sa.Column(
            'created_at',
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now()
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now()
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    pass
