"""
Отправка сообщений в Telegram-чат по chat_id — используется, чтобы
пересылать жителю ответ оператора связи на его обращение (см.
incoming_email_service.py), для ручных ответов сотрудника (см.
ticket_service.send_manual_telegram_reply), и для автоматических
уведомлений ("Ваше обращение отправлено оператору"). Работает
независимо от того, запущен ли сейчас сам процесс бота — это обычный
вызов Telegram Bot API, не требующий активного polling.
"""
import asyncio
import logging
import os

from dotenv import load_dotenv
from telegram import Bot
from telegram.error import TelegramError

load_dotenv()

logger = logging.getLogger("telegram_notify")

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")


# ---------------------------------------------------------------------------
# Важно: НЕ храним единый Bot-объект между вызовами (был такой соблазн —
# "чтобы не создавать заново"). У Bot внутри свой асинхронный HTTP-клиент,
# который привязывается к тому event loop, что был активен при первом
# использовании. А каждый вызов asyncio.run() ниже создаёт СВОЙ новый
# event loop и закрывает его по завершении — если переиспользовать один
# и тот же Bot между разными вызовами asyncio.run(), его клиент оказывается
# привязан к уже закрытому циклу, и отправка через раз тихо ломается.
# Поэтому создаём свежий Bot и сразу же его закрываем — целиком внутри
# одного и того же event loop, за один присест.
# ---------------------------------------------------------------------------

async def _send_message_async(chat_id: int, text: str) -> None:
    async with Bot(token=TELEGRAM_BOT_TOKEN) as bot:
        await bot.send_message(chat_id=chat_id, text=text)


async def _send_photo_async(
    chat_id: int,
    photo_path: str,
    caption: str | None
) -> None:
    async with Bot(token=TELEGRAM_BOT_TOKEN) as bot:
        with open(photo_path, "rb") as photo_file:
            await bot.send_photo(
                chat_id=chat_id,
                photo=photo_file,
                caption=caption
            )


async def _fire_and_forget(coro, chat_id: int, action_label: str) -> None:
    """
    Обёртка для фонового режима (см. _run_async ниже) — раз снаружи
    результат никто синхронно не ждёт, ошибку нужно поймать и
    залогировать здесь же, внутри самой фоновой задачи, иначе она
    молча потеряется (или всплывёт как малопонятное предупреждение
    asyncio "Task exception was never retrieved").
    """
    try:
        await coro
    except TelegramError as error:
        logger.warning(
            "Не удалось %s в Telegram (chat_id=%s): %s",
            action_label, chat_id, error
        )
    except Exception:
        logger.exception(
            "Неожиданная ошибка при попытке %s в Telegram (chat_id=%s)",
            action_label, chat_id
        )


def _run_async(coro, chat_id: int, action_label: str):
    """
    Выполняет корутину — по-разному, в зависимости от того, откуда
    её вызвали.

    Если текущий поток НЕ крутит сейчас никакой event loop (обычный
    синхронный код — веб-запрос, фоновая проверка почты и т.п.) —
    просто asyncio.run(): дожидаемся результата, ошибки (если есть)
    поднимаются наверх как обычно — это важно там, где сотруднику
    нужно точно знать, дошёл ли его ручной ответ жителю.

    Если же вызов идёт ИЗНУТРИ уже работающего event loop (обработчик
    самого Telegram-бота — а бот и backend делят один процесс и один
    и тот же event loop) — синхронно ждать здесь нельзя ни в коем
    случае: это заморозило бы весь backend целиком, включая сайт (уже
    случалось на практике — после сообщения боту сайт "вечно
    проверял авторизацию", потому что общий цикл событий был занят
    ожиданием ответа от Telegram). В этом случае просто планируем
    корутину как фоновую задачу и не ждём её результата — уведомление
    уйдёт чуть позже, в фоне, ничего не блокируя; ошибку в этом
    случае залогируем сами, внутри задачи (см. _fire_and_forget) —
    синхронно вернуть её вызывающему коду здесь физически невозможно,
    не блокируя цикл.
    """

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop is not None:
        loop.create_task(_fire_and_forget(coro, chat_id, action_label))
        return None

    return asyncio.run(coro)


def send_telegram_message(chat_id: int, text: str) -> str | None:
    """
    Отправляет текстовое сообщение в указанный Telegram-чат.

    Возвращает None при успехе (или если отправка ушла в фон — см.
    _run_async), иначе — текст реальной причины сбоя (нет токена,
    чат недоступен, пользователь заблокировал бота и т.п.). Никогда
    не поднимает исключение, чтобы сбой уведомления не ломал
    остальную обработку.
    """

    if not TELEGRAM_BOT_TOKEN:
        error_text = "TELEGRAM_BOT_TOKEN не настроен в backend/.env"
        logger.warning("%s (chat_id=%s)", error_text, chat_id)
        return error_text

    try:
        _run_async(
            _send_message_async(chat_id, text),
            chat_id,
            "отправить сообщение"
        )
        return None

    except TelegramError as error:
        logger.warning(
            "Не удалось отправить сообщение в Telegram (chat_id=%s): %s",
            chat_id, error
        )
        return str(error)

    except Exception as error:
        logger.exception(
            "Неожиданная ошибка при отправке сообщения в Telegram "
            "(chat_id=%s)",
            chat_id
        )
        return str(error)


def send_telegram_photo(
    chat_id: int,
    photo_path: str,
    caption: str | None = None
) -> str | None:
    """
    Отправляет фото (с подписью, если указана) в Telegram-чат.
    Тот же принцип, что и send_telegram_message — не поднимает
    исключение, возвращает None при успехе, иначе текст причины.
    """

    if not TELEGRAM_BOT_TOKEN:
        error_text = "TELEGRAM_BOT_TOKEN не настроен в backend/.env"
        logger.warning("%s (chat_id=%s)", error_text, chat_id)
        return error_text

    try:
        _run_async(
            _send_photo_async(chat_id, photo_path, caption),
            chat_id,
            "отправить фото"
        )
        return None

    except TelegramError as error:
        logger.warning(
            "Не удалось отправить фото в Telegram (chat_id=%s): %s",
            chat_id, error
        )
        return str(error)

    except Exception as error:
        logger.exception(
            "Неожиданная ошибка при отправке фото в Telegram (chat_id=%s)",
            chat_id
        )
        return str(error)
