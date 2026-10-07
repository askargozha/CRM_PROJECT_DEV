"""
Синхронизация с внешней CRM (crm.smartaqmola.kz) — периодически
забирает оттуда обращения и импортирует к нам только те, что реально
похожи на связь/интернет, под общим служебным аккаунтом (тот же
принцип, что у Telegram-бота и мини-приложения Aitu).

ВАЖНО про безопасность/приватность: токен, который используется
сейчас — временный, широкий ("supervisor"), он видит ВСЕ категории
обращений их CRM, не только связь. Именно поэтому здесь двойная
фильтрация на нашей стороне (и по названию категории, и по тексту
жалобы через telecom_filter) — как обязательная защита, пока не
готов ограниченный токен на их стороне (видящий только категорию
"Интернет и связь"). Когда такой токен появится — эта фильтрация
всё равно останется как дополнительная подстраховка, просто
перестанет быть единственной линией защиты.

Формат ответа их API пока не подтверждён вживую (наша песочница не
может обратиться к их серверу напрямую — ограничение сети) — код
написан по документации/структуре БД, которую прислали, с разумными
запасными вариантами на случай отличий в реальном ответе. Как только
будет реальный пример ответа — можно будет уточнить точные названия
полей, если что-то не совпадёт.
"""
import logging
import os

import httpx
from sqlalchemy.orm import Session

from app.core.roles import CITIZEN_ROLE_NAME
from app.core.security import hash_password
from app.models.role import Role
from app.models.user import User
from app.repositories.ticket_repository import TicketRepository
from app.schemas.ticket import TicketCreate
from app.services.telecom_filter import is_telecom_related
from app.services.ticket_service import TicketService

logger = logging.getLogger("external_crm_sync")

EXTERNAL_CRM_API_URL = os.getenv("EXTERNAL_CRM_API_URL", "").rstrip("/")
EXTERNAL_CRM_API_TOKEN = os.getenv("EXTERNAL_CRM_API_TOKEN", "")

EXTERNAL_SYNC_ACCOUNT_USERNAME = "external_crm_sync"

ticket_service = TicketService()
ticket_repository = TicketRepository()


def _get_or_create_sync_account(db: Session) -> User:
    """
    Единый служебный аккаунт для импортированных обращений — тот же
    принцип, что у бота (_get_or_create_bot_account) и у
    мини-приложения Aitu.
    """

    user = (
        db.query(User)
        .filter(User.username == EXTERNAL_SYNC_ACCOUNT_USERNAME)
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
        full_name="Импорт из внешней CRM (связь)",
        username=EXTERNAL_SYNC_ACCOUNT_USERNAME,
        email="external-crm-sync@smart-aqmola-service.kz",
        password_hash=hash_password(os.urandom(16).hex()),
        role_id=role.id,
        is_active=True
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def _extract_category_text(appeal: dict) -> str:
    """
    В реальном ответе их API категория приходит ДВУМЯ отдельными
    плоскими полями: "category" (число, id) и "category_name"
    (готовое название текстом) — это выяснилось только после
    реального теста запроса, до этого предполагалось, что категория
    может прийти вложенным объектом или строкой в самом "category".
    Проверяем оба варианта для надёжности.
    """

    if appeal.get("category_name"):
        return str(appeal["category_name"])

    category = appeal.get("category")

    if isinstance(category, dict):
        return str(category.get("name") or "")

    if isinstance(category, str):
        return category

    # Голый числовой id ничего не скажет о названии категории — в
    # этом случае полагаемся только на текст самой жалобы.
    return ""


def _extract_applicant_name(appeal: dict) -> str:

    if appeal.get("applicant_name"):
        return appeal["applicant_name"]

    applicant = appeal.get("applicant")

    if isinstance(applicant, dict):
        return (
            applicant.get("full_name")
            or applicant.get("name")
            or ""
        )

    return ""


def _extract_district(appeal: dict) -> str | None:

    if appeal.get("district"):
        return appeal["district"]

    district_ref = appeal.get("district_ref")

    if isinstance(district_ref, dict):
        return district_ref.get("name")

    return None


def _is_relevant_appeal(appeal: dict) -> bool:
    """
    True, если обращение похоже на связь/интернет — по названию
    категории (если удалось её извлечь) или по тексту самой жалобы.
    """

    category_text = _extract_category_text(appeal)
    description = appeal.get("description") or ""

    return (
        is_telecom_related(category_text)
        or is_telecom_related(description)
    )


def _convert_appeal_to_ticket_data(appeal: dict) -> TicketCreate | None:

    phone = appeal.get("applicant_phone")
    description = appeal.get("description")

    if not phone or not description:
        logger.warning(
            "Пропускаю обращение %s из внешней CRM — нет телефона "
            "или описания",
            appeal.get("number", "?")
        )
        return None

    return TicketCreate(
        applicant=_extract_applicant_name(appeal) or "Заявитель (внешняя CRM)",
        phone=phone,
        description=description,
        source="Внешняя CRM",
        district=_extract_district(appeal),
        external_reference=appeal.get("number")
    )


def _fetch_appeal_detail(appeal_id) -> dict | None:
    """
    В списке (GET /api/appeals/) поля "description" нет вообще —
    выяснилось на реальном тесте, там только базовые поля для
    быстрого обзора. Полный текст жалобы (и, вероятно, район/адрес)
    есть только в карточке конкретного обращения.
    """

    try:
        response = httpx.get(
            f"{EXTERNAL_CRM_API_URL}/api/appeals/{appeal_id}/",
            headers={
                "Authorization": f"Token {EXTERNAL_CRM_API_TOKEN}"
            },
            timeout=30
        )
        response.raise_for_status()
        return response.json()

    except Exception:
        logger.exception(
            "Не удалось получить карточку обращения %s из внешней CRM",
            appeal_id
        )
        return None


def sync_external_appeals(db_session_factory) -> None:
    """
    Один проход синхронизации — забирает обращения из внешней CRM,
    оставляет только то, что похоже на связь, и создаёт у нас то,
    чего ещё не было (по external_reference).

    db_session_factory — фабрика сессий БД (обычно SessionLocal),
    передаётся параметром, а не импортируется напрямую, чтобы этот
    модуль не тянул за собой app.database на уровне импорта — так
    его проще тестировать в изоляции.
    """

    if not EXTERNAL_CRM_API_URL or not EXTERNAL_CRM_API_TOKEN:
        logger.warning(
            "EXTERNAL_CRM_API_URL/EXTERNAL_CRM_API_TOKEN не заданы — "
            "синхронизация с внешней CRM отключена."
        )
        return

    try:
        response = httpx.get(
            f"{EXTERNAL_CRM_API_URL}/api/appeals/",
            headers={
                "Authorization": f"Token {EXTERNAL_CRM_API_TOKEN}"
            },
            timeout=30
        )
        response.raise_for_status()
        payload = response.json()

    except Exception:
        logger.exception("Не удалось получить обращения из внешней CRM")
        return

    # DRF-пагинация обычно отдаёт {"results": [...], "next": ...} —
    # но на случай, если пагинации нет, поддержим и просто список.
    if isinstance(payload, dict):
        appeals = payload.get("results", [])
    elif isinstance(payload, list):
        appeals = payload
    else:
        appeals = []

    if not appeals:
        logger.info("Внешняя CRM: новых данных нет (или формат не распознан)")
        return

    db = db_session_factory()
    imported_count = 0
    skipped_count = 0

    try:
        sync_account = _get_or_create_sync_account(db)

        for appeal in appeals:

            external_reference = appeal.get("number")
            appeal_id = appeal.get("id")

            if not external_reference or appeal_id is None:
                continue

            if ticket_repository.exists_by_external_reference(
                db, external_reference
            ):
                continue

            # Быстрая проверка по тому, что уже есть в списке (в
            # основном — category_name) — без лишнего сетевого
            # запроса для явно нерелевантных обращений.
            if not _is_relevant_appeal(appeal):
                skipped_count += 1
                continue

            # Похоже на связь — подтягиваем полную карточку: в
            # списке нет текста жалобы вообще, он есть только тут.
            detail = _fetch_appeal_detail(appeal_id)

            if detail is None:
                continue

            # В карточке (в отличие от списка) поля "category_name"
            # нет вообще — только голый "category" (число id).
            # Переносим то, что уже узнали из списка, чтобы вторая
            # проверка тоже видела название категории, а не только
            # текст жалобы.
            if "category_name" not in detail and appeal.get("category_name"):
                detail["category_name"] = appeal["category_name"]

            if not _is_relevant_appeal(detail):
                skipped_count += 1
                continue

            ticket_data = _convert_appeal_to_ticket_data(detail)

            if ticket_data is None:
                continue

            ticket_service.create_ticket(db, ticket_data, sync_account)
            imported_count += 1

        if imported_count or skipped_count:
            logger.info(
                "Синхронизация с внешней CRM: импортировано %s, "
                "отфильтровано (не про связь) %s",
                imported_count, skipped_count
            )

    except Exception:
        logger.exception("Ошибка при синхронизации с внешней CRM")

    finally:
        db.close()
