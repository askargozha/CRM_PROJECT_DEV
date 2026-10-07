from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class AssignedUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    username: str
    email: str
    role_id: int
    is_active: bool


class TicketAttachmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    file_path: str


class TicketBase(BaseModel):
    applicant: str = Field(min_length=1, max_length=255)
    phone: str = Field(min_length=1, max_length=30)
    description: str = Field(min_length=1)

    source: str = "Веб-форма"
    district: str | None = None
    category: str | None = None
    operator: str | None = None

    priority: str = "Средний"
    status: str = "Новое"

    assigned_user_id: int | None = None
    deadline: datetime | None = None


class TicketCreate(TicketBase):
    # Заполняется только при создании обращения через Telegram-бота —
    # нужно, чтобы потом можно было отправить ответ оператора связи
    # обратно тому же человеку в тот же чат.
    telegram_chat_id: int | None = None

    # Заполняется только при импорте из внешней CRM — номер
    # обращения в ИХ системе, чтобы не задваивать при повторной
    # синхронизации.
    external_reference: str | None = None


class TicketUpdate(BaseModel):
    applicant: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = Field(default=None, min_length=1, max_length=30)
    description: str | None = Field(default=None, min_length=1)

    source: str | None = None
    district: str | None = None
    category: str | None = None
    operator: str | None = None

    priority: str | None = None
    status: str | None = None

    assigned_user_id: int | None = None
    deadline: datetime | None = None


class TicketResponse(TicketBase):
    model_config = ConfigDict(from_attributes=True)

    id: int

    telegram_chat_id: int | None = None

    attachments: list[TicketAttachmentResponse] = []

    ai_category: str | None = None
    ai_operator: str | None = None
    ai_priority: str | None = None
    ai_summary: str | None = None
    ai_confidence: float | None = None
    ai_processed: bool
    ai_draft_letter: str | None = None
    ai_is_meaningful: bool | None = None
    ai_contains_profanity: bool | None = None
    ai_moderation_reason: str | None = None

    created_date: date
    created_at: datetime
    updated_at: datetime

    assigned_user: AssignedUserResponse | None = None
    created_by_user_id: int | None = None

    email_sent: bool = False
    email_recipient: str | None = None
    email_operator_id: int | None = None
    email_error: str | None = None


# Алиасы на случай, если роутер использует другие названия схем
TicketRead = TicketResponse
# Алиасы на случай, если роутер использует другие названия схем
TicketRead = TicketResponse
Ticket = TicketResponse


class TicketAnalyticsItem(BaseModel):
    """
    Урезанная проекция обращения для общей аналитики: доступна
    любой роли, включая "Пользователь" (жителя), поэтому здесь
    сознательно нет ФИО/телефона/описания — только то, что нужно
    для графиков и карточек статистики. Район и оператор связи —
    не персональные данные, это административная единица и
    ИИ-классификация обращения, их оставляем.
    """
    model_config = ConfigDict(from_attributes=True)

    status: str
    district: str | None = None
    ai_category: str | None = None
    operator: str | None = None
    ai_operator: str | None = None
    created_date: date
    email_sent: bool = False


class SendEmailRequest(BaseModel):
    """
    Необязательное тело запроса для POST /tickets/{id}/send-email —
    если manual_email передан, письмо уходит именно на этот адрес,
    в обход списка операторов рассылки. Иначе, если передан
    email_operator_id, письмо уходит именно этому оператору (ручной
    выбор из списка). Если не передано ни то, ни другое — по обычной
    автоматической логике (по оператору связи, указанному в
    сообщении).
    """
    email_operator_id: int | None = None
    manual_email: EmailStr | None = None