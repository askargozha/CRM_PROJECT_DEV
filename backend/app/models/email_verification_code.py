from datetime import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class EmailVerificationCode(Base):
    """
    Одноразовый код подтверждения email при регистрации жителя.
    Одна запись на email — при повторной отправке кода старая
    строка перезаписывается новой (см. UserService).
    """
    __tablename__ = "email_verification_codes"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        unique=True,
        index=True
    )

    code: Mapped[str] = mapped_column(
        String(6),
        nullable=False
    )

    attempts: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow
    )
