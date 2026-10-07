from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class EmailOperator(Base):
    """
    Получатель писем о новых сообщениях. Отдельная сущность от
    системных пользователей (User) — оператору не нужен логин и
    доступ к CRM, ему просто приходят письма на почту.
    """

    __tablename__ = "email_operators"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    full_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        unique=True
    )

    # Второй адрес (необязательный) — письмо уходит сразу обоим,
    # например, если у оператора связи два ответственных сотрудника.
    secondary_email: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    # Третий адрес (необязательный) — ещё одна копия каждого письма этому
    # оператору, например руководителю, которому нужно видеть всю рассылку.
    tertiary_email: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now()
    )
