"""
Telegram-бот приёма обращений Smart Aqmola.

Запуск (отдельным процессом, параллельно с uvicorn):

    cd backend
    python -m app.telegram_bot

Нужен токен бота в backend/.env:

    TELEGRAM_BOT_TOKEN=токен_от_BotFather

Получить токен: написать @BotFather в Telegram → /newbot → следовать
инструкциям → скопировать выданный токен в .env.

Логика:
    - При первом обращении бот один раз спрашивает имя и фамилию, а
      при первом составлении обращения — телефон. Оба значения (и
      выбранный язык) запоминаются по chat_id в таблице
      telegram_users и больше не переспрашиваются.
    - Главное меню (постоянная клавиатура) — четыре кнопки:
      "Составить обращение", "Изменить имя", "Изменить телефон",
      "Язык / Тіл" (переключает RU/KZ для всех сообщений бота).
    - По умолчанию всё на русском — язык меняется только если
      человек сам нажмёт кнопку "Язык / Тіл".
    - Составление обращения: (телефон, если ещё не known) → район →
      оператор связи → фото (по желанию, можно приложить несколько
      подряд) → суть обращения.
    - Готовое обращение создаётся через тот же TicketService, что и
      веб-форма — то есть сразу попадает в общий список тикетов с
      ИИ-анализом (категория/оператор/приоритет/резюме) и письмом
      нужному оператору связи, если email для него настроен. Фото
      сохраняются в backend/uploads и отображаются в карточке
      обращения в веб-CRM.
"""
import asyncio
import logging
import os
import re
import shutil
import tempfile
import uuid

from dotenv import load_dotenv
from telegram import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    ReplyKeyboardMarkup,
    Update
)
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    ConversationHandler,
    MessageHandler,
    filters
)

from app.core.roles import CITIZEN_ROLE_NAME
from app.core.security import hash_password
from app.core.uploads import UPLOADS_DIR
from app.database import SessionLocal
from app.models.role import Role
from app.models.telegram_user import TelegramUser
from app.models.ticket_attachment import TicketAttachment
from app.models.user import User
from app.schemas.ticket import TicketCreate
from app.services.ticket_service import TicketService

load_dotenv()

logging.basicConfig(
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    level=logging.INFO
)
logger = logging.getLogger("telegram_bot")

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")

BOT_ACCOUNT_USERNAME = "telegram_bot"

DEFAULT_LANGUAGE = "ru"

PHONE, DISTRICT, OPERATOR, PHOTO_CHOICE, PHOTO, DESCRIPTION = range(6)

# Те же 3 города + 17 районов, что и на карте в веб-CRM (см.
# frontend/src/data/akmolaDistricts.js) — специально одинаковый
# список в двух местах, чтобы обращения из бота корректно попадали
# на карту по названию района.
AKMOLA_DISTRICTS = [
    ("Кокшетау", "city"),
    ("Степногорск", "city"),
    ("Щучинск", "city"),
    ("Аккольский", "district"),
    ("Аршалынский", "district"),
    ("Астраханский", "district"),
    ("Атбасарский", "district"),
    ("Биржан сал", "district"),
    ("Буландынский", "district"),
    ("Бурабайский", "district"),
    ("Егиндыкольский", "district"),
    ("Ерейментауский", "district"),
    ("Есильский", "district"),
    ("Жаксынский", "district"),
    ("Жаркаинский", "district"),
    ("Зерендинский", "district"),
    ("Коргалжынский", "district"),
    ("Сандыктауский", "district"),
    ("Целиноградский", "district"),
    ("Шортандинский", "district"),
]

ticket_service = TicketService()


# ------------------------------------------------------------------
# Тексты бота (RU/KZ). По умолчанию везде используется "ru" — если
# человек ни разу не нажмёт кнопку "Язык / Тіл", ничего не меняется
# по сравнению с тем, что было раньше.
# ------------------------------------------------------------------

BOT_TEXTS = {
    "welcome_back": {
        "ru": "С возвращением, {name}! Выберите действие в меню ниже.",
        "kz": "Қайта келуіңізбен, {name}! Төмендегі мәзірден әрекетті таңдаңыз."
    },
    "welcome_new": {
        "ru": "Здравствуйте! Это бот приёма обращений Smart Aqmola по "
              "вопросам связи и интернета в Акмолинской области.\n\n"
              "Для начала укажите, пожалуйста, ваши имя и фамилию:",
        "kz": "Сәлеметсіз бе! Бұл Ақмола облысындағы байланыс және "
              "интернет мәселелері бойынша өтініштерді қабылдайтын "
              "Smart Aqmola боты.\n\n"
              "Алдымен атыңыз бен тегіңізді көрсетіңіз:"
    },
    "enter_new_name": {
        "ru": "Введите новые имя и фамилию:",
        "kz": "Жаңа атыңыз бен тегіңізді енгізіңіз:"
    },
    "enter_new_phone": {
        "ru": "Введите новый номер телефона:",
        "kz": "Жаңа телефон нөміріңізді енгізіңіз:"
    },
    "name_too_short": {
        "ru": "Пожалуйста, укажите имя И фамилию, например: Асыл Нурланова",
        "kz": "Атыңыз БЕН тегіңізді көрсетіңіз, мысалы: Асыл Нұрланова"
    },
    "name_saved": {
        "ru": "Спасибо, {name}! Выберите действие в меню ниже.",
        "kz": "Рақмет, {name}! Төмендегі мәзірден әрекетті таңдаңыз."
    },
    "phone_invalid": {
        "ru": "Похоже, номер указан некорректно. Попробуйте ещё раз:",
        "kz": "Нөмір қате көрсетілген сияқты. Қайта көріңіз:"
    },
    "phone_updated": {
        "ru": "Телефон обновлён: {phone}",
        "kz": "Телефон жаңартылды: {phone}"
    },
    "need_start": {
        "ru": "Сначала укажите имя и фамилию — отправьте команду /start",
        "kz": "Алдымен атыңыз бен тегіңізді көрсетіңіз — /start "
              "командасын жіберіңіз"
    },
    "phone_known_ask_district": {
        "ru": "Телефон для связи: {phone} (поменять можно кнопкой "
              "«Изменить телефон» в меню).\n\n"
              "Укажите район или населённый пункт:",
        "kz": "Байланыс телефоны: {phone} (мәзірдегі «Телефонды өзгерту» "
              "батырмасымен ауыстыруға болады).\n\n"
              "Ауданды немесе елді мекенді көрсетіңіз:"
    },
    "ask_phone": {
        "ru": "Укажите номер телефона для связи:",
        "kz": "Байланыс үшін телефон нөмірін көрсетіңіз:"
    },
    "ask_district": {
        "ru": "Выберите ваш район или город:",
        "kz": "Ауданыңызды немесе қалаңызды таңдаңыз:"
    },
    "district_known_ask_operator": {
        "ru": "Район/город: {district} (поменять можно кнопкой «Изменить "
              "район/город» в меню).\n\n"
              "Выберите оператора связи, к которому относится обращение:",
        "kz": "Аудан/қала: {district} (мәзірдегі «Ауданды/қаланы өзгерту» "
              "батырмасымен ауыстыруға болады).\n\n"
              "Өтініш қатысты байланыс операторын таңдаңыз:"
    },
    "enter_new_district": {
        "ru": "Выберите новый район или город:",
        "kz": "Жаңа ауданды немесе қаланы таңдаңыз:"
    },
    "district_saved": {
        "ru": "Район/город обновлён: {district}",
        "kz": "Аудан/қала жаңартылды: {district}"
    },
    "interrupted_district": {
        "ru": "Составление обращения прервано. Выберите новый район или город:",
        "kz": "Өтініш жасау тоқтатылды. Жаңа ауданды немесе қаланы таңдаңыз:"
    },
    "ask_operator": {
        "ru": "Выберите оператора связи, к которому относится обращение:",
        "kz": "Өтініш қатысты байланыс операторын таңдаңыз:"
    },
    "operator_chosen": {
        "ru": "Оператор связи: {choice}",
        "kz": "Байланыс операторы: {choice}"
    },
    "ask_photo": {
        "ru": "Приложите фото по обращению?",
        "kz": "Өтінішке фото тіркейсіз бе?"
    },
    "send_photo": {
        "ru": "Пришлите фото одним сообщением:",
        "kz": "Фотоны бір хабарламамен жіберіңіз:"
    },
    "photo_attached_count": {
        "ru": "Фото приложено: {n}",
        "kz": "Тіркелген фото: {n}"
    },
    "no_photo": {
        "ru": "Хорошо, без фото.",
        "kz": "Жарайды, фотосыз."
    },
    "ask_description": {
        "ru": "Опишите суть обращения — что произошло, где и когда:",
        "kz": "Өтініштің мәнін сипаттаңыз — не болды, қайда және қашан:"
    },
    "not_a_photo": {
        "ru": "Это не похоже на фото. Пришлите изображение одним "
              "сообщением, либо нажмите «Нет» на предыдущем сообщении.",
        "kz": "Бұл фотоға ұқсамайды. Суретті бір хабарламамен жіберіңіз, "
              "немесе алдыңғы хабарламада «Жоқ» дегенді басыңыз."
    },
    "photo_added_more": {
        "ru": "Фото добавлено ({n}). Приложить ещё одно?",
        "kz": "Фото қосылды ({n}). Тағы біреуін тіркейсіз бе?"
    },
    "ticket_error": {
        "ru": "Не удалось создать обращение из-за технической ошибки. "
              "Попробуйте ещё раз чуть позже.",
        "kz": "Техникалық қате салдарынан өтінішті жасау мүмкін "
              "болмады. Сәл кейінірек қайталап көріңіз."
    },
    "ticket_forming": {
        "ru": "✅ Обращение сформировано, обрабатываем...",
        "kz": "✅ Өтініш қалыптастырылды, өңдеудеміз..."
    },
    "ticket_created": {
        "ru": "Обращение №{id} принято!{photo_note} ",
        "kz": "№{id} өтініші қабылданды!{photo_note} "
    },
    "photo_note": {
        "ru": " К обращению приложено фото: {n}.",
        "kz": " Өтінішке {n} фото тіркелді."
    },
    "cancelled": {
        "ru": "Составление обращения отменено.",
        "kz": "Өтініш жасау тоқтатылды."
    },
    "interrupted_name": {
        "ru": "Составление обращения прервано. Введите новые имя и фамилию:",
        "kz": "Өтініш жасау тоқтатылды. Жаңа атыңыз бен тегіңізді енгізіңіз:"
    },
    "interrupted_phone": {
        "ru": "Составление обращения прервано. Введите новый номер телефона:",
        "kz": "Өтініш жасау тоқтатылды. Жаңа телефон нөміріңізді енгізіңіз:"
    },
    "restarting": {
        "ru": "Начинаем составление обращения заново.",
        "kz": "Өтініш жасауды қайтадан бастаймыз."
    },
    "language_switched": {
        "ru": "Язык переключён на русский.",
        "kz": "Тіл қазақ тіліне ауыстырылды."
    },
}


def t(key: str, lang: str, **kwargs) -> str:
    entry = BOT_TEXTS.get(key, {})
    text = entry.get(lang) or entry.get(DEFAULT_LANGUAGE) or key
    return text.format(**kwargs) if kwargs else text


def _get_lang(context: ContextTypes.DEFAULT_TYPE) -> str:
    return context.user_data.get("lang", DEFAULT_LANGUAGE)


# ------------------------------------------------------------------
# Кнопки меню и клавиатуры — есть на русском и на казахском, чтобы
# при переключении языка сама клавиатура тоже поменялась.
# ------------------------------------------------------------------

BTN_NEW_TICKET = {"ru": "📝 Составить обращение", "kz": "📝 Өтініш жасау"}
BTN_CHANGE_NAME = {"ru": "✏️ Изменить имя", "kz": "✏️ Атын өзгерту"}
BTN_CHANGE_PHONE = {"ru": "📞 Изменить телефон", "kz": "📞 Телефонды өзгерту"}
BTN_CHANGE_DISTRICT = {"ru": "📍 Изменить район/город", "kz": "📍 Ауданды/қаланы өзгерту"}
BTN_LANGUAGE = "🌐 Язык / Тіл"

# Все варианты (обоих языков) — фильтры должны узнавать кнопку
# независимо от того, на каком языке она сейчас показана человеку
# (например, если клавиатура на экране "застряла" со старого языка).
_ALL_BTN_TEXTS = [
    BTN_NEW_TICKET["ru"], BTN_NEW_TICKET["kz"],
    BTN_CHANGE_NAME["ru"], BTN_CHANGE_NAME["kz"],
    BTN_CHANGE_PHONE["ru"], BTN_CHANGE_PHONE["kz"],
    BTN_CHANGE_DISTRICT["ru"], BTN_CHANGE_DISTRICT["kz"],
    BTN_LANGUAGE,
]

NOT_A_MENU_BUTTON = ~filters.Regex(
    f"^({'|'.join(re.escape(text) for text in _ALL_BTN_TEXTS)})$"
)

NEW_TICKET_REGEX = (
    f"^({re.escape(BTN_NEW_TICKET['ru'])}|{re.escape(BTN_NEW_TICKET['kz'])})$"
)
CHANGE_NAME_REGEX = (
    f"^({re.escape(BTN_CHANGE_NAME['ru'])}|{re.escape(BTN_CHANGE_NAME['kz'])})$"
)
CHANGE_PHONE_REGEX = (
    f"^({re.escape(BTN_CHANGE_PHONE['ru'])}|{re.escape(BTN_CHANGE_PHONE['kz'])})$"
)
CHANGE_DISTRICT_REGEX = (
    f"^({re.escape(BTN_CHANGE_DISTRICT['ru'])}|{re.escape(BTN_CHANGE_DISTRICT['kz'])})$"
)
LANGUAGE_REGEX = f"^{re.escape(BTN_LANGUAGE)}$"


def get_main_keyboard(lang: str) -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        [
            [BTN_NEW_TICKET[lang]],
            [BTN_CHANGE_NAME[lang], BTN_CHANGE_PHONE[lang]],
            [BTN_CHANGE_DISTRICT[lang]],
            [BTN_LANGUAGE]
        ],
        resize_keyboard=True,
        is_persistent=True
    )


def get_district_keyboard(lang: str) -> InlineKeyboardMarkup:
    """
    Инлайн-клавиатура выбора района/города — по 2 в ряд, чтобы не
    растягивать список на весь экран. callback_data — просто индекс
    в AKMOLA_DISTRICTS, название не гоняем туда-обратно.
    """

    buttons = [
        InlineKeyboardButton(
            (f"🏙 {name}" if kind == "city" else name),
            callback_data=f"dist_{index}"
        )
        for index, (name, kind) in enumerate(AKMOLA_DISTRICTS)
    ]

    rows = [
        buttons[i:i + 2]
        for i in range(0, len(buttons), 2)
    ]

    return InlineKeyboardMarkup(rows)


def get_photo_choice_keyboard(lang: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton(
                "Да" if lang == "ru" else "Иә",
                callback_data="photo_yes"
            ),
            InlineKeyboardButton(
                "Нет" if lang == "ru" else "Жоқ",
                callback_data="photo_no"
            )
        ]
    ])


# Значение (то, что реально попадёт в ticket.operator и должно
# совпадать с тем, что ожидает ИИ/рассылка писем) отделено от
# подписи на кнопке — подпись можно спокойно переводить, ничего не
# сломав в маршрутизации писем операторам.
OPERATOR_CHOICES = [
    {"value": "Kcell", "ru": "Kcell", "kz": "Kcell"},
    {"value": "Beeline", "ru": "Beeline", "kz": "Beeline"},
    {"value": "Tele2", "ru": "Tele2", "kz": "Tele2"},
    {"value": "Казахтелеком", "ru": "Казахтелеком", "kz": "Қазақтелеком"},
    {
        "value": None,
        "ru": "Не знаю / пусть определит ИИ",
        "kz": "Білмеймін / ЖИ анықтасын"
    },
]


# ------------------------------------------------------------------
# Вспомогательные функции работы с БД
# ------------------------------------------------------------------

def _get_or_create_bot_account(db) -> User:
    """
    Единый сервисный аккаунт, от имени которого бот создаёт
    обращения (роль CITIZEN_ROLE_NAME). Сам человек, который писал
    в бота, указывается в полях applicant/phone самого обращения —
    отдельный аккаунт на каждого пользователя Telegram не заводится.
    """

    user = (
        db.query(User)
        .filter(User.username == BOT_ACCOUNT_USERNAME)
        .first()
    )

    if user:
        return user

    role = (
        db.query(Role)
        .filter(Role.name == CITIZEN_ROLE_NAME)
        .first()
    )

    if role is None:
        raise RuntimeError(
            "Роль CITIZEN_ROLE_NAME не найдена в БД — сначала "
            "примените все миграции backend (alembic upgrade head)."
        )

    user = User(
        full_name="Telegram-бот Smart Aqmola",
        username=BOT_ACCOUNT_USERNAME,
        email="telegram-bot@smart-aqmola-service.kz",
        password_hash=hash_password(os.urandom(16).hex()),
        role_id=role.id,
        is_active=True
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def _get_profile(db, chat_id: int) -> TelegramUser | None:
    return (
        db.query(TelegramUser)
        .filter(TelegramUser.chat_id == chat_id)
        .first()
    )


def _save_name(db, chat_id: int, full_name: str, language: str) -> None:
    record = _get_profile(db, chat_id)

    if record:
        record.full_name = full_name
    else:
        db.add(
            TelegramUser(
                chat_id=chat_id,
                full_name=full_name,
                language=language
            )
        )

    db.commit()


def _save_phone(db, chat_id: int, phone: str) -> None:
    record = _get_profile(db, chat_id)

    if record:
        record.phone = phone
        db.commit()
    # Если записи ещё нет — телефон сохранять некуда (имя всегда
    # запрашивается раньше телефона), такое не должно происходить.


def _save_district(db, chat_id: int, district: str) -> None:
    record = _get_profile(db, chat_id)

    if record:
        record.district = district
        db.commit()


def _save_language(db, chat_id: int, language: str) -> None:
    record = _get_profile(db, chat_id)

    if record:
        record.language = language
        db.commit()
    # Если профиля ещё нет (человек ещё не назвал имя) — выбор языка
    # хранится только в user_data этой сессии и сохранится в БД, как
    # только профиль будет создан (см. _save_name).


# ------------------------------------------------------------------
# /start, смена языка и запрос имени (один раз)
# ------------------------------------------------------------------

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:

    chat_id = update.effective_chat.id

    db = SessionLocal()
    try:
        profile = _get_profile(db, chat_id)
    finally:
        db.close()

    if profile:
        lang = profile.language or DEFAULT_LANGUAGE
        context.user_data["lang"] = lang
        context.user_data["awaiting_name"] = False
        context.user_data["awaiting_phone"] = False

        await update.message.reply_text(
            t("welcome_back", lang, name=profile.full_name),
            reply_markup=get_main_keyboard(lang)
        )
        return

    lang = context.user_data.get("lang", DEFAULT_LANGUAGE)
    context.user_data["awaiting_name"] = True

    await update.message.reply_text(
        t("welcome_new", lang)
    )


async def toggle_language(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE
) -> None:

    current_lang = _get_lang(context)
    new_lang = "kz" if current_lang == "ru" else "ru"
    context.user_data["lang"] = new_lang

    chat_id = update.effective_chat.id

    db = SessionLocal()
    try:
        _save_language(db, chat_id, new_lang)
    finally:
        db.close()

    await update.message.reply_text(
        t("language_switched", new_lang),
        reply_markup=get_main_keyboard(new_lang)
    )


async def change_name_start(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE
) -> None:
    context.user_data["awaiting_name"] = True
    await update.message.reply_text(
        t("enter_new_name", _get_lang(context))
    )


async def change_phone_start(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE
) -> None:
    context.user_data["awaiting_phone"] = True
    await update.message.reply_text(
        t("enter_new_phone", _get_lang(context))
    )


async def change_district_start(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE
) -> None:
    lang = _get_lang(context)
    context.user_data["awaiting_district"] = True
    await update.message.reply_text(
        t("enter_new_district", lang),
        reply_markup=get_district_keyboard(lang)
    )


async def handle_name(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:

    if not context.user_data.get("awaiting_name"):
        return

    lang = _get_lang(context)
    full_name = (update.message.text or "").strip()

    if len(full_name.split()) < 2:
        await update.message.reply_text(
            t("name_too_short", lang)
        )
        return

    chat_id = update.effective_chat.id

    db = SessionLocal()
    try:
        _save_name(db, chat_id, full_name, lang)
    finally:
        db.close()

    context.user_data["awaiting_name"] = False

    await update.message.reply_text(
        t("name_saved", lang, name=full_name),
        reply_markup=get_main_keyboard(lang)
    )


async def handle_phone_change(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE
) -> None:

    if not context.user_data.get("awaiting_phone"):
        return

    lang = _get_lang(context)
    phone = (update.message.text or "").strip()

    if len(phone) < 5:
        await update.message.reply_text(
            t("phone_invalid", lang)
        )
        return

    chat_id = update.effective_chat.id

    db = SessionLocal()
    try:
        _save_phone(db, chat_id, phone)
    finally:
        db.close()

    context.user_data["awaiting_phone"] = False

    await update.message.reply_text(
        t("phone_updated", lang, phone=phone),
        reply_markup=get_main_keyboard(lang)
    )


# ------------------------------------------------------------------
# Составление обращения (ConversationHandler)
# ------------------------------------------------------------------

async def new_ticket_start(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE
) -> int:

    chat_id = update.effective_chat.id

    db = SessionLocal()
    try:
        profile = _get_profile(db, chat_id)
    finally:
        db.close()

    if not profile:
        await update.message.reply_text(
            t("need_start", _get_lang(context))
        )
        return ConversationHandler.END

    lang = profile.language or DEFAULT_LANGUAGE
    context.user_data["lang"] = lang

    context.user_data["ticket"] = {"applicant": profile.full_name}

    if not profile.phone:
        await update.message.reply_text(
            t("ask_phone", lang)
        )
        return PHONE

    context.user_data["ticket"]["phone"] = profile.phone

    if not profile.district:
        await update.message.reply_text(
            t("phone_known_ask_district", lang, phone=profile.phone),
            reply_markup=get_district_keyboard(lang)
        )
        return DISTRICT

    context.user_data["ticket"]["district"] = profile.district

    await update.message.reply_text(
        t("district_known_ask_operator", lang, district=profile.district),
        reply_markup=InlineKeyboardMarkup([
            [
                InlineKeyboardButton(
                    choice[lang],
                    callback_data=f"op_{index}"
                )
            ]
            for index, choice in enumerate(OPERATOR_CHOICES)
        ])
    )
    return OPERATOR


async def handle_phone(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE
) -> int:

    lang = _get_lang(context)
    phone = (update.message.text or "").strip()

    context.user_data["ticket"]["phone"] = phone

    chat_id = update.effective_chat.id
    db = SessionLocal()
    try:
        _save_phone(db, chat_id, phone)
    finally:
        db.close()

    await update.message.reply_text(
        t("ask_district", lang),
        reply_markup=get_district_keyboard(lang)
    )

    return DISTRICT


async def handle_district_choice(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE
) -> int:
    """
    Единый обработчик выбора района/города из инлайн-клавиатуры —
    используется и как часть составления обращения (состояние
    DISTRICT), и как самостоятельная смена района/города через кнопку
    меню (тогда в user_data стоит awaiting_district). Разница — в том,
    что делаем с выбором, а не в том, как он приходит.
    """

    lang = _get_lang(context)

    query = update.callback_query
    await query.answer()

    try:
        index = int(query.data.removeprefix("dist_"))
        district_name, _kind = AKMOLA_DISTRICTS[index]
    except (ValueError, IndexError):
        return ConversationHandler.END

    chat_id = update.effective_chat.id
    db = SessionLocal()
    try:
        _save_district(db, chat_id, district_name)
    finally:
        db.close()

    if context.user_data.get("awaiting_district"):

        context.user_data["awaiting_district"] = False

        await query.edit_message_text(
            t("district_saved", lang, district=district_name)
        )

        return ConversationHandler.END

    context.user_data["ticket"]["district"] = district_name

    await query.edit_message_text(
        f"📍 {district_name}"
    )

    await context.bot.send_message(
        chat_id=chat_id,
        text=t("ask_operator", lang),
        reply_markup=InlineKeyboardMarkup([
            [
                InlineKeyboardButton(
                    choice[lang],
                    callback_data=f"op_{index}"
                )
            ]
            for index, choice in enumerate(OPERATOR_CHOICES)
        ])
    )

    return OPERATOR


async def handle_operator(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE
) -> int:

    lang = _get_lang(context)

    query = update.callback_query
    await query.answer()

    index = int(query.data.removeprefix("op_"))
    choice = OPERATOR_CHOICES[index]

    context.user_data["ticket"]["operator"] = choice["value"]

    await query.edit_message_text(
        t("operator_chosen", lang, choice=choice[lang])
    )

    await context.bot.send_message(
        chat_id=update.effective_chat.id,
        text=t("ask_photo", lang),
        reply_markup=get_photo_choice_keyboard(lang)
    )

    return PHOTO_CHOICE


async def handle_photo_choice(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE
) -> int:

    lang = _get_lang(context)

    query = update.callback_query
    await query.answer()

    if query.data == "photo_yes":

        await query.edit_message_text(
            t("send_photo", lang)
        )

        return PHOTO

    photos_count = len(
        context.user_data.get("ticket", {}).get("photos", [])
    )

    await query.edit_message_text(
        t("photo_attached_count", lang, n=photos_count)
        if photos_count
        else t("no_photo", lang)
    )

    await context.bot.send_message(
        chat_id=update.effective_chat.id,
        text=t("ask_description", lang)
    )

    return DESCRIPTION


async def handle_photo(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE
) -> int:

    lang = _get_lang(context)
    photo_sizes = update.message.photo

    if not photo_sizes:
        await update.message.reply_text(
            t("not_a_photo", lang)
        )
        return PHOTO

    largest_photo = photo_sizes[-1]
    telegram_file = await largest_photo.get_file()

    temp_path = os.path.join(
        tempfile.gettempdir(),
        f"tg_photo_{uuid.uuid4().hex}.jpg"
    )

    await telegram_file.download_to_drive(temp_path)

    photos = context.user_data["ticket"].setdefault("photos", [])
    photos.append(temp_path)

    await update.message.reply_text(
        t("photo_added_more", lang, n=len(photos)),
        reply_markup=get_photo_choice_keyboard(lang)
    )

    return PHOTO_CHOICE


async def handle_description(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE
) -> int:

    lang = _get_lang(context)

    context.user_data["ticket"]["description"] = (
        update.message.text or ""
    ).strip()

    data = context.user_data["ticket"]
    photo_paths = data.get("photos", [])

    # Мгновенный ответ — сразу, до того как начнётся ИИ-анализ (он
    # может занимать несколько секунд, особенно при перегрузке
    # Gemini) — чтобы человек сразу видел, что его обращение приняли,
    # а не пугался паузы молчания. Финальное сообщение с номером
    # обращения придёт отдельно, чуть позже, как и раньше.
    await update.message.reply_text(
        t("ticket_forming", lang)
    )

    db = SessionLocal()
    try:

        bot_account = _get_or_create_bot_account(db)

        ticket_data = TicketCreate(
            applicant=data["applicant"],
            phone=data["phone"],
            description=data["description"],
            source="Telegram-бот",
            district=data.get("district") or None,
            operator=data.get("operator"),
            telegram_chat_id=update.effective_chat.id
        )

        ticket = ticket_service.create_ticket(
            db,
            ticket_data,
            bot_account,
            send_notification=not photo_paths
        )

        ticket_id = ticket.id

        if photo_paths:
            _save_photos_to_ticket(db, ticket_id, photo_paths)

            # Если create_ticket не заблокировал отправку (лимит на
            # аккаунт/модерация ИИ — в этом случае email_error уже
            # заполнен) — отправляем письмо только теперь, вместе с
            # уже прикреплёнными фото.
            if not ticket.email_error:
                ticket_service.send_notification_email_now(db, ticket)

    except Exception:
        logger.exception("Не удалось создать обращение из Telegram")

        _cleanup_temp_photos(photo_paths)

        await update.message.reply_text(
            t("ticket_error", lang),
            reply_markup=get_main_keyboard(lang)
        )

        context.user_data.pop("ticket", None)
        return ConversationHandler.END

    finally:
        db.close()

    context.user_data.pop("ticket", None)

    photo_note = (
        t("photo_note", lang, n=len(photo_paths))
        if photo_paths
        else ""
    )

    await update.message.reply_text(
        t("ticket_created", lang, id=ticket_id, photo_note=photo_note),
        reply_markup=get_main_keyboard(lang)
    )

    return ConversationHandler.END


def _save_photos_to_ticket(
    db,
    ticket_id: int,
    temp_paths: list[str]
) -> None:
    """
    Переносит скачанные из Telegram фото из временной папки в
    backend/uploads и создаёт по одной записи TicketAttachment на
    каждое — после этого они видны в карточке обращения в веб-CRM.
    """

    for index, temp_path in enumerate(temp_paths, start=1):

        if not os.path.exists(temp_path):
            continue

        extension = os.path.splitext(temp_path)[1] or ".jpg"
        filename = f"ticket_{ticket_id}_{index}{extension}"
        destination = os.path.join(UPLOADS_DIR, filename)

        shutil.move(temp_path, destination)

        db.add(
            TicketAttachment(
                ticket_id=ticket_id,
                file_path=filename
            )
        )

    db.commit()


def _cleanup_temp_photos(temp_paths: list[str]) -> None:
    """Удаляет временные файлы фото, если обращение не создалось."""

    for temp_path in temp_paths:
        try:
            if os.path.exists(temp_path):
                os.remove(temp_path)
        except OSError:
            logger.warning(
                "Не удалось удалить временный файл фото: %s",
                temp_path
            )


async def cancel(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE
) -> int:

    lang = _get_lang(context)

    ticket_data = context.user_data.pop("ticket", None)

    if ticket_data:
        _cleanup_temp_photos(ticket_data.get("photos", []))

    await update.message.reply_text(
        t("cancelled", lang),
        reply_markup=get_main_keyboard(lang)
    )

    return ConversationHandler.END


# ------------------------------------------------------------------
# "Аварийные выходы" из диалога составления обращения — срабатывают,
# если пользователь нажал кнопку меню ПОСРЕДИ диалога (например,
# ответил на вопрос про район не текстом, а нажал "Изменить имя").
# Без этого текст кнопки просто проглатывался бы как ответ на текущий
# вопрос, а диалог оставался бы "подвешенным" — и повторное нажатие
# "Составить обращение" не срабатывало бы вообще, пока активен старый
# диалог.
# ------------------------------------------------------------------

async def interrupt_change_name(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE
) -> int:

    lang = _get_lang(context)

    ticket_data = context.user_data.pop("ticket", None)

    if ticket_data:
        _cleanup_temp_photos(ticket_data.get("photos", []))

    context.user_data["awaiting_name"] = True

    await update.message.reply_text(
        t("interrupted_name", lang)
    )

    return ConversationHandler.END


async def interrupt_change_phone(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE
) -> int:

    lang = _get_lang(context)

    ticket_data = context.user_data.pop("ticket", None)

    if ticket_data:
        _cleanup_temp_photos(ticket_data.get("photos", []))

    context.user_data["awaiting_phone"] = True

    await update.message.reply_text(
        t("interrupted_phone", lang)
    )

    return ConversationHandler.END


async def interrupt_change_district(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE
) -> int:

    lang = _get_lang(context)

    ticket_data = context.user_data.pop("ticket", None)

    if ticket_data:
        _cleanup_temp_photos(ticket_data.get("photos", []))

    context.user_data["awaiting_district"] = True

    await update.message.reply_text(
        t("interrupted_district", lang),
        reply_markup=get_district_keyboard(lang)
    )

    return ConversationHandler.END


async def interrupt_restart_ticket(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE
) -> int:

    lang = _get_lang(context)

    ticket_data = context.user_data.pop("ticket", None)

    if ticket_data:
        _cleanup_temp_photos(ticket_data.get("photos", []))

    await update.message.reply_text(
        t("restarting", lang)
    )

    return await new_ticket_start(update, context)


async def interrupt_toggle_language(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE
) -> int:
    """
    Переключение языка посреди диалога составления обращения — сам
    диалог при этом продолжается как ни в чём не бывало (в отличие от
    смены имени/телефона, здесь ничего прерывать не нужно), просто
    меняется язык последующих сообщений. Возвращаем текущее
    состояние диалога, чтобы он не прерывался.
    """

    await toggle_language(update, context)

    ticket_data = context.user_data.get("ticket")

    if ticket_data is None:
        return ConversationHandler.END

    if "description" in ticket_data:
        return DESCRIPTION
    if "operator" in ticket_data:
        return PHOTO_CHOICE
    if "district" in ticket_data:
        return OPERATOR
    if "phone" in ticket_data:
        return DISTRICT

    return PHONE


def build_application() -> Application:
    """
    Собирает и настраивает Application бота (все обработчики), но НЕ
    запускает приём сообщений — это отдельно, через application.run_polling()
    (обычный отдельный процесс, см. main()) либо через run_bot_polling()
    (запуск внутри уже работающего event loop, см. app/main.py — нужно,
    когда для бота нет отдельного бесплатного "воркера", как на Render,
    и его приходится запускать в том же процессе, что и сам backend).
    """

    if not TELEGRAM_BOT_TOKEN:
        raise RuntimeError(
            "Не задан TELEGRAM_BOT_TOKEN в backend/.env — получите "
            "токен у @BotFather в Telegram и добавьте его в .env"
        )

    application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()

    conversation = ConversationHandler(
        entry_points=[
            MessageHandler(
                filters.Regex(NEW_TICKET_REGEX),
                new_ticket_start
            )
        ],
        states={
            PHONE: [
                MessageHandler(
                    filters.TEXT & ~filters.COMMAND & NOT_A_MENU_BUTTON,
                    handle_phone
                )
            ],
            DISTRICT: [
                CallbackQueryHandler(handle_district_choice)
            ],
            OPERATOR: [
                CallbackQueryHandler(handle_operator)
            ],
            PHOTO_CHOICE: [
                CallbackQueryHandler(handle_photo_choice)
            ],
            PHOTO: [
                MessageHandler(
                    filters.PHOTO,
                    handle_photo
                ),
                MessageHandler(
                    filters.TEXT & ~filters.COMMAND & NOT_A_MENU_BUTTON,
                    handle_photo
                )
            ],
            DESCRIPTION: [
                MessageHandler(
                    filters.TEXT & ~filters.COMMAND & NOT_A_MENU_BUTTON,
                    handle_description
                )
            ]
        },
        fallbacks=[
            CommandHandler("cancel", cancel),
            MessageHandler(
                filters.Regex(LANGUAGE_REGEX),
                interrupt_toggle_language
            ),
            MessageHandler(
                filters.Regex(NEW_TICKET_REGEX),
                interrupt_restart_ticket
            ),
            MessageHandler(
                filters.Regex(CHANGE_NAME_REGEX),
                interrupt_change_name
            ),
            MessageHandler(
                filters.Regex(CHANGE_PHONE_REGEX),
                interrupt_change_phone
            ),
            MessageHandler(
                filters.Regex(CHANGE_DISTRICT_REGEX),
                interrupt_change_district
            )
        ]
    )

    application.add_handler(CommandHandler("start", start))
    application.add_handler(conversation)

    application.add_handler(
        MessageHandler(filters.Regex(CHANGE_NAME_REGEX), change_name_start)
    )
    application.add_handler(
        MessageHandler(filters.Regex(CHANGE_PHONE_REGEX), change_phone_start)
    )
    application.add_handler(
        MessageHandler(filters.Regex(CHANGE_DISTRICT_REGEX), change_district_start)
    )
    application.add_handler(
        MessageHandler(filters.Regex(LANGUAGE_REGEX), toggle_language)
    )

    # Топ-уровневый обработчик выбора района/города — срабатывает,
    # когда это САМОСТОЯТЕЛЬНАЯ смена (кнопка "Изменить район/город"
    # вне составления обращения). Когда выбор происходит ВНУТРИ
    # диалога (состояние DISTRICT) — его перехватывает сам диалог
    # раньше, до этого обработчика.
    application.add_handler(
        CallbackQueryHandler(handle_district_choice, pattern=r"^dist_")
    )

    # Отдельным (вторым) слоем — ловит имя/телефон, когда ждём их
    # после /start или после кнопок "Изменить имя"/"Изменить телефон".
    # На состояния диалога составления обращения не влияет: срабатывает
    # только пока выставлен соответствующий awaiting_* флаг.
    application.add_handler(
        MessageHandler(
            filters.TEXT & ~filters.COMMAND & NOT_A_MENU_BUTTON,
            handle_name
        ),
        group=1
    )
    application.add_handler(
        MessageHandler(
            filters.TEXT & ~filters.COMMAND & NOT_A_MENU_BUTTON,
            handle_phone_change
        ),
        group=2
    )

    return application


async def run_bot_polling() -> None:
    """
    Асинхронный запуск бота ВНУТРИ уже работающего event loop — в
    отличие от application.run_polling() (который сам управляет своим
    циклом событий и не может быть вызван изнутри чужого, как раз то,
    с чем мы уже сталкивались в telegram_notify.py). Используется,
    когда для бота нет отдельного процесса/"воркера" — например, на
    Render на бесплатном тарифе — и его запускают прямо внутри
    процесса backend (см. app/main.py, переменная RUN_BOT_IN_BACKEND).
    """

    try:
        application = build_application()

        await application.initialize()
        await application.start()
        await application.updater.start_polling()

        logger.info(
            "Telegram-бот запущен внутри backend-процесса, "
            "ожидаю сообщения..."
        )

        try:
            # Держим корутину живой, пока работает сам backend —
            # polling происходит в фоне через updater, эта задача
            # просто "спит".
            while True:
                await asyncio.sleep(3600)
        finally:
            await application.updater.stop()
            await application.stop()
            await application.shutdown()

    except Exception:
        logger.exception(
            "Не удалось запустить Telegram-бота внутри backend-процесса "
            "(проверьте TELEGRAM_BOT_TOKEN в .env)"
        )


def main() -> None:

    application = build_application()

    logger.info("Telegram-бот запущен, ожидаю сообщения...")
    application.run_polling()


if __name__ == "__main__":
    main()
