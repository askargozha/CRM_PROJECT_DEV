from datetime import date, datetime

from sqlalchemy import BigInteger, Boolean, Date, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_types import EncryptedString
from app.database import Base


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    applicant: Mapped[str] = mapped_column(
        EncryptedString,
        nullable=False
    )

    phone: Mapped[str] = mapped_column(
        EncryptedString,
        nullable=False
    )

    description: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    source: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="Веб-форма"
    )

    district: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True
    )

    category: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    operator: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    priority: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="Средний"
    )

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="Новое"
    )

    assigned_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    assigned_user = relationship(
        "User",
        foreign_keys=[assigned_user_id]
    )

    created_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    created_by_user = relationship(
        "User",
        foreign_keys=[created_by_user_id]
    )

    # Заполняется только для обращений, созданных через Telegram-бота —
    # позволяет потом отправить ответ оператора связи обратно в тот
    # же чат.
    telegram_chat_id: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True
    )

    # Заполняется только для обращений, импортированных из внешней
    # CRM (crm.smartaqmola.kz) — хранит их номер ("109-2026-000003"),
    # чтобы при повторной синхронизации не создавать одно и то же
    # обращение дважды.
    external_reference: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        unique=True,
        index=True
    )

    deadline: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )

    ai_category: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    ai_operator: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    ai_priority: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True
    )

    ai_summary: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    ai_confidence: Mapped[float | None] = mapped_column(
        Float,
        nullable=True
    )

    ai_processed: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False
    )

    ai_draft_letter: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    ai_is_meaningful: Mapped[bool | None] = mapped_column(
        Boolean,
        nullable=True
    )

    ai_contains_profanity: Mapped[bool | None] = mapped_column(
        Boolean,
        nullable=True
    )

    ai_moderation_reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    email_sent: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False
    )

    email_recipient: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    email_operator_id: Mapped[int | None] = mapped_column(
        ForeignKey("email_operators.id", ondelete="SET NULL"),
        nullable=True
    )

    email_error: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    created_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        default=date.today
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.now
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.now,
        onupdate=datetime.now
    )

    attachments = relationship(
        "TicketAttachment",
        order_by="TicketAttachment.id",
        cascade="all, delete-orphan"
    )