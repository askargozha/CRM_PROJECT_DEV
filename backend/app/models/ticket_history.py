
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TicketHistory(Base):
    __tablename__ = "ticket_history"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )
    # При удалении обращения связь обнуляется, но запись истории сохраняется.
    ticket_id: Mapped[int | None] = mapped_column(
        ForeignKey("tickets.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # Храним исходный ID обращения, чтобы идентифицировать его после удаления.
    ticket_reference: Mapped[int] = mapped_column(
        nullable=False,
        index=True,
    )

    actor_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )

    event_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    description: Mapped[str] = mapped_column(
        String(500),
        nullable=False
    )
        # Значение до изменения, если оно есть.
    before_value: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # Значение после изменения, если оно есть.
    after_value: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    details: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False
    )

    actor = relationship("User")

    __table_args__ = (
        Index("ix_ticket_history_ticket_created", "ticket_id", "created_at"),
    )
