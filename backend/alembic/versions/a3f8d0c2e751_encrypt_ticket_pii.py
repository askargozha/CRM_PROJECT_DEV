"""encrypt applicant and phone fields on tickets

Revision ID: a3f8d0c2e751
Revises: f4a7c1d8b3e6
Create Date: 2026-08-28 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3f8d0c2e751'
down_revision: Union[str, Sequence[str], None] = 'f4a7c1d8b3e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    1. Расширяем колонки applicant/phone до TEXT — зашифрованное
       значение заметно длиннее исходного, в старый короткий
       VARCHAR оно не влезет.
    2. Шифруем уже существующие (пока ещё открытым текстом) значения
       — без этого шифрование затронуло бы только новые обращения, а
       старые остались бы читаемыми напрямую из базы.

    Идемпотентно: строки, которые уже зашифрованы (начинаются с
    "enc::" — например, при повторном запуске миграции), повторно
    не трогаем.
    """

    op.alter_column(
        'tickets', 'applicant',
        existing_type=sa.String(length=255),
        type_=sa.Text(),
        existing_nullable=False
    )

    op.alter_column(
        'tickets', 'phone',
        existing_type=sa.String(length=30),
        type_=sa.Text(),
        existing_nullable=False
    )

    # Импортируем именно здесь (а не в начале файла) — на случай,
    # если этот модуль когда-то переедет, миграция всё равно должна
    # была бы явно показывать, что тянет шифрование из основного кода
    # приложения, а не дублировать его логику.
    from app.core.encryption import encrypt_value

    connection = op.get_bind()

    rows = connection.execute(
        sa.text('SELECT id, applicant, phone FROM tickets')
    ).fetchall()

    for row in rows:

        ticket_id, applicant, phone = row

        already_encrypted = (
            (applicant or '').startswith('enc::')
            and (phone or '').startswith('enc::')
        )

        if already_encrypted:
            continue

        connection.execute(
            sa.text(
                'UPDATE tickets SET applicant = :applicant, '
                'phone = :phone WHERE id = :id'
            ),
            {
                'applicant': encrypt_value(applicant),
                'phone': encrypt_value(phone),
                'id': ticket_id
            }
        )


def downgrade() -> None:
    """
    Расшифровываем данные обратно и возвращаем прежние (короткие)
    типы колонок. Внимание: если после апгрейда добавлялись новые
    обращения с телефоном/ФИО длиннее прежнего лимита (30/255
    символов), downgrade по этим строкам не пройдёт — это ожидаемо,
    откат схемы назад в принципе не гарантирован без потерь в такой
    ситуации.
    """

    from app.core.encryption import decrypt_value

    connection = op.get_bind()

    rows = connection.execute(
        sa.text('SELECT id, applicant, phone FROM tickets')
    ).fetchall()

    for row in rows:

        ticket_id, applicant, phone = row

        connection.execute(
            sa.text(
                'UPDATE tickets SET applicant = :applicant, '
                'phone = :phone WHERE id = :id'
            ),
            {
                'applicant': decrypt_value(applicant),
                'phone': decrypt_value(phone),
                'id': ticket_id
            }
        )

    op.alter_column(
        'tickets', 'applicant',
        existing_type=sa.Text(),
        type_=sa.String(length=255),
        existing_nullable=False
    )

    op.alter_column(
        'tickets', 'phone',
        existing_type=sa.Text(),
        type_=sa.String(length=30),
        existing_nullable=False
    )
