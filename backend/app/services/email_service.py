"""
Отправка писем через обычный Gmail SMTP: уведомления операторам
связи о новых сообщениях и коды подтверждения при регистрации.

Настройка (backend/.env):
    GMAIL_ADDRESS=адрес отправителя, например smart.aqmola.srm@gmail.com
    GMAIL_APP_PASSWORD=пароль ПРИЛОЖЕНИЯ (не обычный пароль от аккаунта!)

Получатели уведомлений о сообщениях хранятся в базе данных (таблица
email_operators, управляется на странице "Операторы рассылки") — по
одной записи на оператора связи (Kcell / Beeline / Tele2 / Altel /
Казахтелеком / ...). Письмо о конкретном сообщении уходит на email
того оператора, который указан в самом сообщении (ticket.operator,
при отсутствии — ticket.ai_operator) — НЕ по кругу между записями.

Важно: обычный пароль от Gmail-аккаунта для SMTP не подходит — Google
требует либо пароль приложения (App Password, нужна включённая
двухфакторная аутентификация), либо OAuth2.
"""
import mimetypes
import os
import smtplib
from email.message import EmailMessage

from dotenv import load_dotenv
from sqlalchemy.orm import Session

from app.core.uploads import UPLOADS_DIR
from app.models.email_operator import EmailOperator
from app.services.email_operator_service import EmailOperatorService

load_dotenv()

GMAIL_ADDRESS = os.getenv("GMAIL_ADDRESS", "")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "").replace(" ", "")
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_TIMEOUT_SECONDS = 20

_operator_service = EmailOperatorService()


class EmailSendError(Exception):
    """Ошибка настройки или отправки email-уведомления."""


def _send_email(
    to: str,
    subject: str,
    body: str,
    attachment_paths: list[str] | None = None
) -> None:

    if not GMAIL_ADDRESS or not GMAIL_APP_PASSWORD:
        raise EmailSendError(
            "Не настроены GMAIL_ADDRESS / GMAIL_APP_PASSWORD в backend/.env"
        )

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = GMAIL_ADDRESS
    message["To"] = to
    message.set_content(body)

    for file_path in (attachment_paths or []):

        if not os.path.exists(file_path):
            continue

        mime_type, _ = mimetypes.guess_type(file_path)
        maintype, subtype = (
            mime_type.split("/", 1)
            if mime_type
            else ("application", "octet-stream")
        )

        with open(file_path, "rb") as attachment_file:
            message.add_attachment(
                attachment_file.read(),
                maintype=maintype,
                subtype=subtype,
                filename=os.path.basename(file_path)
            )

    try:
        with smtplib.SMTP(
            SMTP_HOST,
            SMTP_PORT,
            timeout=SMTP_TIMEOUT_SECONDS
        ) as server:

            server.starttls()
            server.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
            server.send_message(message)

    except smtplib.SMTPAuthenticationError as error:
        raise EmailSendError(
            "Gmail отклонил логин/пароль. Обычный пароль от аккаунта "
            "не подходит — нужен пароль приложения (App Password). "
            f"Подробности: {error}"
        ) from error

    except smtplib.SMTPException as error:
        raise EmailSendError(
            f"Ошибка отправки письма: {error}"
        ) from error

    except OSError as error:
        raise EmailSendError(
            f"Не удалось подключиться к почтовому серверу: {error}"
        ) from error


def _build_subject(ticket) -> str:

    category = (
        ticket.ai_category or
        ticket.category or
        "без категории"
    )

    return f"Smart Aqmola: обращение №{ticket.id} — {category}"


def _build_body(ticket) -> str:

    lines = [
        "Добрый день, пришла жалоба.",
        "",
        f"Заявитель: {ticket.applicant}",
        f"Телефон: {ticket.phone or '—'}",
        f"Район: {ticket.district or 'не указан'}",
        f"Оператор связи: {ticket.operator or 'не определён'}",
        "",
        "Описание:",
        ticket.description or "—",
    ]

    if ticket.ai_processed:

        lines += [
            "",
            f"Категория: {ticket.ai_category or '—'}",
            f"Резюме: {ticket.ai_summary or '—'}",
        ]

        if ticket.ai_draft_letter:

            lines += [
                "",
                ticket.ai_draft_letter,
            ]

    if ticket.attachments:
        lines += [
            "",
            f"К обращению приложено фото: {len(ticket.attachments)} "
            "(см. вложения к этому письму).",
        ]

    return "\n".join(lines)


def _operator_recipients(operator: EmailOperator) -> list[str]:
    """
    Все адреса оператора рассылки, на которые уходит письмо: основной,
    второй и третий (два последних необязательные). Повторы убираются —
    если один адрес вписали дважды, письмо придёт на него один раз.
    """

    recipients: list[str] = []

    for address in (operator.email, operator.secondary_email, operator.tertiary_email):
        if address and address.lower() not in {r.lower() for r in recipients}:
            recipients.append(address)

    return recipients


def send_ticket_notification(
    db: Session,
    ticket,
    override_operator_id: int | None = None,
    manual_email: str | None = None
) -> tuple[str, EmailOperator | None]:
    """
    Отправляет письмо о сообщении.

    Порядок приоритета получателя:
    1. manual_email — если сотрудник вписал адрес вручную, письмо
       уходит именно туда, в обход списка операторов рассылки.
    2. override_operator_id — письмо уходит выбранному из списка
       оператору (ручной выбор получателя).
    3. Иначе — на email того оператора связи, который указан в самом
       сообщении: ticket.operator, а если он не заполнен вручную, то
       ticket.ai_operator (то, что определил ИИ).

    Возвращает (строка адресов для отображения в карточке, объект
    EmailOperator — или None, если использовался manual_email).
    Поднимает EmailSendError при любой проблеме — вызывающий код
    должен обрабатывать эту ошибку так, чтобы не ломать создание
    сообщения.
    """

    operator = None

    if manual_email:

        recipients = [manual_email]

    elif override_operator_id is not None:

        operator = _operator_service.get_by_id(db, override_operator_id)

        if not operator:
            raise EmailSendError(
                "Выбранный получатель не найден в списке операторов рассылки."
            )

        recipients = _operator_recipients(operator)

    else:

        operator_name = ticket.operator or ticket.ai_operator

        if not operator_name:
            raise EmailSendError(
                "У обращения не определён оператор связи (ни вручную, "
                "ни через ИИ) — отправлять письмо некому."
            )

        operator = _operator_service.get_for_operator_name(db, operator_name)

        if not operator:
            raise EmailSendError(
                f"Для оператора «{operator_name}» не настроен email — "
                "добавьте его на странице «Операторы рассылки»."
            )

        recipients = _operator_recipients(operator)

    attachment_paths = [
        os.path.join(UPLOADS_DIR, attachment.file_path)
        for attachment in (ticket.attachments or [])
    ]

    _send_email(
        ", ".join(recipients),
        _build_subject(ticket),
        _build_body(ticket),
        attachment_paths
    )

    return ", ".join(recipients), operator


def send_verification_code(email: str, code: str) -> None:
    """
    Отправляет код подтверждения email при регистрации.
    Поднимает EmailSendError при любой проблеме — вызывающий код
    должен вернуть пользователю понятную ошибку и не создавать
    аккаунт/код без реально отправленного письма.
    """

    subject = "Smart Aqmola: код подтверждения регистрации"

    body = (
        f"Код подтверждения регистрации: {code}\n\n"
        "Код действителен 10 минут. Если вы не запрашивали "
        "регистрацию в Smart Aqmola — просто проигнорируйте это письмо.\n\n"
        "—\n"
        "Это автоматическое письмо системы Smart Aqmola CRM. "
        "Отвечать на него не нужно."
    )

    _send_email(email, subject, body)
