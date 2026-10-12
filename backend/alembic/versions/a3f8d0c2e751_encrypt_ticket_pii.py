"""encrypt applicant and phone fields on tickets

Revision ID: a3f8d0c2e751
Revises: f4a7c1d8b3e6
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a3f8d0c2e751"
down_revision: Union[str, Sequence[str], None] = "f4a7c1d8b3e6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    from app.core.encryption import encrypt_value

    connection = op.get_bind()

    # Не допускаем миграцию без настроенного шифрования.
    probe = encrypt_value("migration_test")
    if not isinstance(probe, str) or not probe.startswith("enc::"):
        raise RuntimeError(
            "Шифрование не настроено. "
            "Проверь FIELD_ENCRYPTION_KEY в backend/.env"
        )

    with op.batch_alter_table("tickets") as batch_op:
        batch_op.alter_column(
            "applicant",
            existing_type=sa.String(255),
            type_=sa.Text(),
            existing_nullable=False,
        )
        batch_op.alter_column(
            "phone",
            existing_type=sa.String(30),
            type_=sa.Text(),
            existing_nullable=False,
        )

    rows = connection.execute(
        sa.text("SELECT id, applicant, phone FROM tickets")
    ).fetchall()

    for ticket_id, applicant, phone in rows:
        values = {}

        if applicant is not None and not applicant.startswith("enc::"):
            values["applicant"] = encrypt_value(applicant)

        if phone is not None and not phone.startswith("enc::"):
            values["phone"] = encrypt_value(phone)

        if values:
            assignments = ", ".join(
                f"{column} = :{column}" for column in values
            )
            connection.execute(
                sa.text(
                    f"UPDATE tickets SET {assignments} WHERE id = :id"
                ),
                {**values, "id": ticket_id},
            )


def downgrade() -> None:
    from app.core.encryption import decrypt_value

    connection = op.get_bind()

    rows = connection.execute(
        sa.text("SELECT id, applicant, phone FROM tickets")
    ).fetchall()

    for ticket_id, applicant, phone in rows:
        connection.execute(
            sa.text(
                "UPDATE tickets "
                "SET applicant = :applicant, phone = :phone "
                "WHERE id = :id"
            ),
            {
                "applicant": decrypt_value(applicant),
                "phone": decrypt_value(phone),
                "id": ticket_id,
            },
        )

    with op.batch_alter_table("tickets") as batch_op:
        batch_op.alter_column(
            "applicant",
            existing_type=sa.Text(),
            type_=sa.String(255),
            existing_nullable=False,
        )
        batch_op.alter_column(
            "phone",
            existing_type=sa.Text(),
            type_=sa.String(30),
            existing_nullable=False,
        )