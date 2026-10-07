"""
Забор входящих писем (в первую очередь — ответов операторов связи
на уведомления по обращениям) через IMAP из того же Gmail-ящика,
что уже настроен для отправки писем (GMAIL_ADDRESS/GMAIL_APP_PASSWORD
в backend/.env — отдельно настраивать ничего не нужно).

Письмо привязывается к обращению по номеру в теме — исходящие письма
уходят с темой вида "Smart Aqmola: обращение №43 — ...", и большинство
почтовых клиентов сохраняют это в теме ответа ("Re: Smart Aqmola:
обращение №43 — ..."). Если номер в теме не найден — письмо всё равно
сохраняется, просто без привязки к обращению (видно в общем списке).
"""
import email
import imaplib
import logging
import os
import re
from datetime import datetime, timezone
from email.header import decode_header
from email.utils import parsedate_to_datetime

from dotenv import load_dotenv
from sqlalchemy.orm import Session

from app.models.incoming_email import IncomingEmail
from app.models.ticket import Ticket
from app.repositories.incoming_email_repository import IncomingEmailRepository
from app.services.telegram_notify import send_telegram_message

load_dotenv()

logger = logging.getLogger("incoming_email_service")

GMAIL_ADDRESS = os.getenv("GMAIL_ADDRESS", "")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "").replace(" ", "")
IMAP_HOST = "imap.gmail.com"
IMAP_PORT = 993

TICKET_NUMBER_PATTERN = re.compile(r"№\s*(\d+)")

_repository = IncomingEmailRepository()


class EmailFetchError(Exception):
    """Ошибка настройки или получения писем по IMAP."""


def _decode_header_value(raw_value: str | None) -> str:

    if not raw_value:
        return ""

    parts = decode_header(raw_value)
    decoded = []

    for text, charset in parts:
        if isinstance(text, bytes):
            try:
                decoded.append(text.decode(charset or "utf-8", errors="replace"))
            except (LookupError, TypeError):
                decoded.append(text.decode("utf-8", errors="replace"))
        else:
            decoded.append(text)

    return "".join(decoded)


def _extract_body(message: email.message.Message) -> str:

    if message.is_multipart():

        plain_part = None
        html_part = None

        for part in message.walk():

            content_type = part.get_content_type()
            disposition = str(part.get("Content-Disposition") or "")

            if "attachment" in disposition:
                continue

            if content_type == "text/plain" and plain_part is None:
                plain_part = part
            elif content_type == "text/html" and html_part is None:
                html_part = part

        chosen = plain_part or html_part

        if chosen is None:
            return ""

        raw = chosen.get_payload(decode=True) or b""
        charset = chosen.get_content_charset() or "utf-8"

        try:
            text = raw.decode(charset, errors="replace")
        except (LookupError, TypeError):
            text = raw.decode("utf-8", errors="replace")

        if chosen is html_part:
            text = re.sub(r"<[^>]+>", " ", text)
            text = re.sub(r"\s+\n", "\n", text)

        return text.strip()

    raw = message.get_payload(decode=True) or b""
    charset = message.get_content_charset() or "utf-8"

    try:
        return raw.decode(charset, errors="replace").strip()
    except (LookupError, TypeError):
        return raw.decode("utf-8", errors="replace").strip()


def _strip_quoted_reply(body: str) -> str:
    """
    Убирает процитированный оригинал письма из ответа оператора —
    у большинства почтовых клиентов (Gmail, Outlook и т.п.) это
    строки, начинающиеся с ">", плюс строка-атрибуция прямо перед
    ними (вида "ср, 5 авг. 2026 г. в 17:40, <адрес>:" или
    "... wrote:"). Оставляет только то, что человек реально написал
    сам, до начала цитаты.
    """

    lines = body.replace("\r\n", "\n").split("\n")

    cutoff = len(lines)

    for index, line in enumerate(lines):
        if line.strip().startswith(">"):
            cutoff = index
            break

    result_lines = lines[:cutoff]

    # Убираем пустые строки в конце, потом саму строку-атрибуцию
    # ("... написал(а):" / "... wrote:" / просто заканчивается на ":"),
    # если она там есть — вместе с пустыми строками, которые могли
    # остаться перед ней.
    while result_lines and not result_lines[-1].strip():
        result_lines.pop()

    if result_lines and result_lines[-1].strip().endswith(":"):
        result_lines.pop()

    while result_lines and not result_lines[-1].strip():
        result_lines.pop()

    return "\n".join(result_lines).strip()


def _extract_ticket_id(subject: str) -> int | None:

    match = TICKET_NUMBER_PATTERN.search(subject)

    if not match:
        return None

    try:
        return int(match.group(1))
    except ValueError:
        return None


def fetch_new_emails(db: Session, limit: int = 50) -> tuple[int, int]:
    """
    Подключается по IMAP, забирает непрочитанные письма из INBOX,
    сохраняет новые в таблицу incoming_emails (уже сохранённые по
    message_id пропускает). Возвращает (сколько забрано, сколько
    из них привязалось к обращению по номеру в теме).

    Поднимает EmailFetchError при проблеме с настройками/подключением.
    """

    if not GMAIL_ADDRESS or not GMAIL_APP_PASSWORD:
        raise EmailFetchError(
            "Не настроены GMAIL_ADDRESS / GMAIL_APP_PASSWORD в backend/.env"
        )

    fetched = 0
    matched = 0

    try:
        with imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT) as imap:

            imap.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
            imap.select("INBOX")

            status, data = imap.search(None, "UNSEEN")

            if status != "OK":
                raise EmailFetchError(
                    f"IMAP-сервер отклонил поиск писем: {status}"
                )

            message_ids = data[0].split()[-limit:]

            for imap_id in message_ids:

                status, msg_data = imap.fetch(imap_id, "(RFC822)")

                if status != "OK" or not msg_data or not msg_data[0]:
                    continue

                raw_email = msg_data[0][1]
                message = email.message_from_bytes(raw_email)

                message_id = (
                    message.get("Message-ID")
                    or f"no-id-{imap_id.decode()}-{GMAIL_ADDRESS}"
                ).strip()

                if _repository.get_by_message_id(db, message_id):
                    continue

                subject = _decode_header_value(message.get("Subject"))
                from_address = _decode_header_value(message.get("From"))
                body = _extract_body(message)

                date_header = message.get("Date")
                try:
                    received_at = (
                        parsedate_to_datetime(date_header)
                        if date_header else datetime.now(timezone.utc)
                    )
                except (TypeError, ValueError):
                    received_at = datetime.now(timezone.utc)

                ticket_id = _extract_ticket_id(subject)
                telegram_chat_id = None

                # В теме мог попасться номер, который не соответствует
                # ни одному реальному обращению (случайное совпадение,
                # обращение удалено и т.д.) — тогда просто не привязываем,
                # а не роняем весь фоновый забор письма нарушением
                # внешнего ключа.
                if ticket_id is not None:
                    ticket_row = (
                        db.query(Ticket.id, Ticket.telegram_chat_id)
                        .filter(Ticket.id == ticket_id)
                        .first()
                    )
                    if not ticket_row:
                        ticket_id = None
                    else:
                        telegram_chat_id = ticket_row.telegram_chat_id

                incoming = IncomingEmail(
                    message_id=message_id,
                    from_address=from_address,
                    subject=subject,
                    body=body,
                    received_at=received_at,
                    ticket_id=ticket_id
                )

                _repository.create(db, incoming)

                fetched += 1
                if ticket_id is not None:
                    matched += 1

                # Если это обращение изначально пришло из Telegram-бота
                # (у него сохранён telegram_chat_id) — пересылаем ответ
                # оператора прямо в тот же чат. Сбой отправки (человек
                # заблокировал бота, нет токена и т.п.) не должен
                # прерывать обработку остальных писем.
                if telegram_chat_id is not None:

                    clean_reply = _strip_quoted_reply(body)

                    reply_text = (
                        f"📬 Пришёл ответ по вашему обращению №{ticket_id}:\n\n"
                        f"{clean_reply or '(письмо без текста)'}"
                    )

                    send_telegram_message(telegram_chat_id, reply_text)

    except imaplib.IMAP4.error as error:
        raise EmailFetchError(
            f"Gmail отклонил подключение/логин по IMAP: {error}. "
            "Проверьте, что IMAP включён в настройках Gmail-аккаунта "
            "(Настройки → Пересылка и POP/IMAP → Включить IMAP)."
        ) from error

    except OSError as error:
        raise EmailFetchError(
            f"Не удалось подключиться к почтовому серверу: {error}"
        ) from error

    return fetched, matched
