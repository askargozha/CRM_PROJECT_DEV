import re
from typing import Any
from sqlalchemy.orm import Session

from app.models.ticket_history import TicketHistory

# ---------------------------------------------------------------------
# ПРИМЕЧАНИЕ ПО БЕЗОПАСНОСТИ:
# Маскирование на основе регулярных выражений является эвристическим методом.
# Оно существенно снижает риск попадания ПДн в базу данных, но НЕ гарантирует
# 100% защиту во всех возможных случаях (например, при нестандартном вводе).
# ---------------------------------------------------------------------

# 1. Номера телефонов (+7 или 8, ровно 10 цифр после префикса)
# Границы (?<!\d) и (?!\d) предохраняют от случайного маскирования обычных чисел и длинных ID.
PHONE_REGEX = re.compile(
    r"(?<!\d)(?:\+?7|8)[\s\-\(]*(\d{3})[\s\-\)]*(\d{3})[\s\-]*(\d{2})[\s\-]*(\d{2})(?!\d)"
)

# 2. ФИО (Русский + Казахский алфавиты: Ә, Ғ, Қ, Ң, Ө, Ұ, Ү, Һ, І)
CYR_UPPER = r"А-ЯЁӘҒҚҢӨҰҮҺІ"
CYR_LOWER = r"а-яёәғқңөұүһі"

# Часть имени: Заглавная + строчные OR полностью ВЕРХНИЙ РЕГИСТР OR строчные (для "-қызы", "-улы")
CYR_NAME_PART = rf"(?:[{CYR_UPPER}][{CYR_LOWER}]{{1,30}}|[{CYR_UPPER}]{{2,30}}|[{CYR_LOWER}]{{1,30}})"

# Составное слово через дефис (Ахмет-Заки, Серикбай-қызы)
CYR_COMPOUND_WORD = rf"(?:[{CYR_UPPER}][{CYR_LOWER}]{{1,30}}|[{CYR_UPPER}]{{2,30}})(?:-{CYR_NAME_PART})*"

# Служебные слова CRM, которые НЕ должны становиться частью ФИО при поиске
CRM_STOP_WORDS = r"(?:Заявитель|Житель|Оператор|Специалист|Администратор|Пользователь|Исполнитель|Автор|Статус|Категория|Район|Обращение|Комментарий|Система)"

# Финальное слово ФИО (с негативной проверкой служебных слов)
CYR_WORD = rf"(?!\b{CRM_STOP_WORDS}\b){CYR_COMPOUND_WORD}"

# Ищем 2 или 3 подряд идущих слова ФИО
FIO_REGEX = re.compile(rf"\b{CYR_WORD}(?:\s+{CYR_WORD}){{1,2}}\b")


def mask_sensitive_data(text: str | None) -> str | None:
    """
    Маскирует номера телефонов (+7/8) и ФИО (RU/KZ) в текстовой строке.
    """
    if not text:
        return text

    # Маскирование телефонов -> +7 *** ***-**-XX
    masked_text = PHONE_REGEX.sub(r"+7 *** ***-**-\4", text)

    # Маскирование ФИО -> [ФИО СКРЫТО]
    masked_text = FIO_REGEX.sub("[ФИО СКРЫТО]", masked_text)

    return masked_text


def mask_sensitive_data_deep(data: Any) -> Any:
    """
    Рекурсивно обходит структуры данных (dict, list, tuple, set, str) и маскирует ПДн.
    Преобразует set и tuple в list, а ключи dict в str для 100% совместимости с JSON-колонками SQLAlchemy.
    """
    if isinstance(data, str):
        return mask_sensitive_data(data)
    elif isinstance(data, dict):
        return {str(k): mask_sensitive_data_deep(v) for k, v in data.items()}
    elif isinstance(data, (list, tuple, set)):
        return [mask_sensitive_data_deep(item) for item in data]
    return data


def log_ticket_event(
    db: Session,
    ticket_id: int,
    event_type: str,
    description: str,
    actor_user_id: int | None = None,
    before_value: str | None = None,
    after_value: str | None = None,
    details: dict[str, Any] | None = None,
) -> TicketHistory:
    """
    Единая точка записи событий истории обращения.

    :raises ValueError: если event_type пуст, не является строкой или превышает 100 символов.
    """
    # 1. Строгая валидация event_type под ограничение String(100)
    if not event_type or not isinstance(event_type, str):
        raise ValueError("Параметр event_type должен быть непустой строкой")

    if len(event_type) > 100:
        raise ValueError(
            f"event_type превышает допустимую длину 100 символов (получено: {len(event_type)})"
        )

    # 2. Маскирование персональных данных
    safe_description = mask_sensitive_data(description) or ""
    safe_before_value = mask_sensitive_data(before_value)
    safe_after_value = mask_sensitive_data(after_value)
    safe_details = mask_sensitive_data_deep(details) if details is not None else None

    # 3. Безопасная обрезка описания под ограничение String(500)
    if len(safe_description) > 500:
        safe_description = safe_description[:497] + "..."

    # 4. Создание записи модели
    history_entry = TicketHistory(
        ticket_id=ticket_id,
        ticket_reference=ticket_id,
        actor_user_id=actor_user_id,
        event_type=event_type,
        description=safe_description,
        before_value=safe_before_value,
        after_value=safe_after_value,
        details=safe_details,
    )

    db.add(history_entry)
    db.flush()

    return history_entry