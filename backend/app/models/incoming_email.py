from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class IncomingEmail(Base):
    """
    Письмо, пришедшее на почтовый ящик CRM (обычно — ответ оператора
    связи на уведомление по обращению). Забирается через IMAP из
    того же Gmail-ящика, что настроен для отправки (GMAIL_ADDRESS).
    """
    __tablename__ = "incoming_emails"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    message_id: Mapped[str] = mapped_column(
        String(998),
        nullable=False,
        unique=True,
        index=True
    )

    from_address: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    subject: Mapped[str] = mapped_column(
        String(998),
        nullable=False,
        default=""
    )

    body: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default=""
    )

    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )

    is_read: Mapped[bool] = mapped_column(
        default=False,
        nullable=False
    )

    ticket_id: Mapped[int | None] = mapped_column(
        ForeignKey("tickets.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    ticket = relationship("Ticket")
