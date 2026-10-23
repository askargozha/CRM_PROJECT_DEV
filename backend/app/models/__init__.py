from app.models.email_operator import EmailOperator
from app.models.email_verification_code import EmailVerificationCode
from app.models.incoming_email import IncomingEmail
from app.models.role import Role
from app.models.telegram_user import TelegramUser
from app.models.ticket import Ticket
from app.models.ticket_attachment import TicketAttachment
from app.models.ticket_comment import TicketComment
from app.models.user import User
from app.models.ticket_history import TicketHistory #Добавил модель истории обращений

__all__ = [
    "EmailOperator",
    "EmailVerificationCode",
    "IncomingEmail",
    "Role",
    "TelegramUser",
    "Ticket",
    "TicketAttachment",
    "TicketComment",
    "User",
    "TicketHistory"          #Зарегистрировал модель истории для импорта через models
]
