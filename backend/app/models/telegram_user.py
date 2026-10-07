from datetime import datetime

from sqlalchemy import BigInteger, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class TelegramUser(Base):
    """
    Житель, который писал в Telegram-бота. Имя запрашивается один
    раз при первом обращении и запоминается по chat_id — при
    следующих сообщениях бот его не переспрашивает.
    """
    __tablename__ = "telegram_users"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    chat_id: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        unique=True,
        index=True
    )

    full_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    phone: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True
    )

    # Запоминается один раз (выбор из фиксированного списка районов/
    # городов Акмолинской области) — при следующих обращениях бот
    # его не переспрашивает, пока человек сам не нажмёт "Изменить
    # район/город".
    district: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    # "ru" или "kz" — запоминается, чтобы бот присылал сообщения на
    # том языке, который человек выбрал в прошлый раз.
    language: Mapped[str] = mapped_column(
        String(2),
        nullable=False,
        default="ru"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow
    )
