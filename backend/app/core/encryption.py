"""
Шифрование чувствительных полей в базе данных (ФИО заявителя,
телефон) — на случай прямого доступа к базе, в обход самого сайта.

Используется симметричное шифрование Fernet (AES-128 под капотом,
с проверкой целостности) — один секретный ключ, который умеет и
шифровать, и расшифровывать.

Ключ берётся из переменной окружения FIELD_ENCRYPTION_KEY. Если она
не задана — поля сохраняются как есть, без шифрования (чтобы не
сломать локальную разработку без .env) — но выводится
предупреждение в лог, чтобы это не осталось незамеченным на боевом
сервере.
"""
import logging
import os

from cryptography.fernet import Fernet, InvalidToken
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

_ENCRYPTION_KEY = os.getenv("FIELD_ENCRYPTION_KEY", "")

_fernet: Fernet | None = None

if _ENCRYPTION_KEY:
    try:
        _fernet = Fernet(_ENCRYPTION_KEY.encode())
    except Exception:
        logger.error(
            "FIELD_ENCRYPTION_KEY задан, но невалиден (должен быть "
            "сгенерирован через Fernet.generate_key()) — шифрование "
            "полей отключено."
        )
        _fernet = None
else:
    logger.warning(
        "FIELD_ENCRYPTION_KEY не задан в .env — ФИО и телефон "
        "заявителей будут сохраняться БЕЗ шифрования. Как получить "
        "ключ: python3 -c \"from cryptography.fernet import Fernet; "
        "print(Fernet.generate_key().decode())\""
    )

# Префикс, по которому при чтении отличаем "уже зашифровано" от
# "старое значение, сохранённое ещё до включения шифрования" — без
# этого расшифровка упадёт на старых, ещё не мигрированных строках.
_ENCRYPTED_PREFIX = "enc::"


def encrypt_value(value: str | None) -> str | None:

    if value is None or _fernet is None:
        return value

    token = _fernet.encrypt(value.encode()).decode()
    return _ENCRYPTED_PREFIX + token


def decrypt_value(value: str | None) -> str | None:

    if value is None:
        return value

    if not value.startswith(_ENCRYPTED_PREFIX):
        # Значение сохранено ещё до включения шифрования (или ключ
        # не задан) — возвращаем как есть, ничего не расшифровываем.
        return value

    if _fernet is None:
        # Ключ пропал/изменился, а значение зашифровано — расшифровать
        # нечем. Явно возвращаем плейсхолдер, а не мусорные байты.
        logger.error(
            "Значение зашифровано, но FIELD_ENCRYPTION_KEY недоступен "
            "— расшифровать невозможно."
        )
        return "[не удалось расшифровать]"

    token = value[len(_ENCRYPTED_PREFIX):]

    try:
        return _fernet.decrypt(token.encode()).decode()
    except InvalidToken:
        logger.error(
            "Не удалось расшифровать значение — неверный ключ или "
            "повреждённые данные."
        )
        return "[не удалось расшифровать]"
