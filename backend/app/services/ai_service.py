"""
ИИ-анализ сообщений через Google Gemini (Google AI Studio).

Нужен бесплатный API-ключ: https://aistudio.google.com/apikey
Ключ кладётся в backend/.env как GEMINI_API_KEY.

Никакого локального сервера не нужно — только доступ в интернет и
ключ.
"""
import json
import logging
import os
import re
import ssl

import httpx
from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel

logger = logging.getLogger(__name__)

load_dotenv()

# ---------------------------------------------------------------------------
# Монкеи-патч для google-genai и httpx, чтобы отключить проверку SSL
# в окружении с нестандартными сертификатами (Docker с антивирусом)
# ---------------------------------------------------------------------------

# Попытаемся отключить проверку SSL для httpx (что использует google-genai)
try:
    import httpx
    
    # Создаём HTTP-клиент без проверки SSL
    _ssl_context = ssl.create_default_context()
    if os.getenv('DOCKER_ENV') == '1':
        _ssl_context.check_hostname = False
        _ssl_context.verify_mode = ssl.CERT_NONE
except ImportError:
    pass

# Патч для ssl модуля
if hasattr(ssl, "VERIFY_X509_STRICT"):
    _original_create_default_context = ssl.create_default_context

    def _patched_create_default_context(*args, **kwargs):
        try:
            context = _original_create_default_context(*args, **kwargs)
            # Отключаем VERIFY_X509_STRICT, но оставляем остальное
            if hasattr(context, 'verify_flags'):
                context.verify_flags &= ~ssl.VERIFY_X509_STRICT
            # В Docker дополнительно отключаем проверку хоста
            if os.getenv('DOCKER_ENV') == '1':
                context.check_hostname = False
                context.verify_mode = ssl.CERT_NONE
            return context
        except Exception as e:
            logger.warning(f"SSL context creation failed: {e}, using permissive context")
            # Полностью отключаем проверку для особо упёртых случаев
            context = ssl.SSLContext()
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
            return context

    ssl.create_default_context = _patched_create_default_context

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-latest")

# Резервный вариант — используется, только если Gemini не смог
# ответить (перегрузка 503, сбой сети и т.п.). Свой отдельный
# бесплатный лимит у Groq, никак не связан с лимитом Gemini — не
# "простукивание" того же самого сервиса, а обращение к другому.
# Если GROQ_API_KEY не задан — резерва просто не будет, ошибка
# Gemini покажется как раньше, ничего не сломается.
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")


def _strip_letter_signature(text: str) -> str:
    """
    Черновик письма уходит оператору без правки сотрудником — модель
    иногда всё равно дописывает подпись/закрывающую формулу вида
    "С уважением, [Ваш отдел]", несмотря на явный запрет в промпте
    (аналогичная своевольность уже случалась и в других частях
    ответа) — обрезаем типовые варианты как дополнительную страховку.
    """

    if not text:
        return text

    patterns = [
        r"\n+\s*С\s+уважением[,.]?.*$",
        r"\n+\s*С\s+наилучшими\s+пожеланиями[,.]?.*$",
        r"\n+\s*\[[^\]\n]*(отдел|организац|подпись|фио|имя)[^\]\n]*\]\s*$",
    ]

    cleaned = text
    for pattern in patterns:
        cleaned = re.sub(
            pattern, "", cleaned, flags=re.IGNORECASE | re.DOTALL
        )

    return cleaned.strip()


def _clean_analysis_result(result: dict) -> dict:
    if result.get("draft_letter"):
        result["draft_letter"] = _strip_letter_signature(
            result["draft_letter"]
        )
    return result

CATEGORIES = [
    "Плохое качество связи",
    "Нет доступа к интернету",
    "Медленный интернет",
    "Обрыв линии / авария",
    "Проблема с SIM-картой",
    "Тарификация и биллинг",
    "Иное",
]

OPERATORS = [
    "Kcell",
    "Beeline",
    "Tele2",
    "Казахтелеком",
    "Другое / не указан",
]

PRIORITIES = ["Низкий", "Средний", "Высокий"]


class AIAnalysisError(Exception):
    """Ошибка при обращении к Gemini или разборе ответа."""


class TicketAnalysis(BaseModel):
    category: str
    operator: str
    priority: str
    assigned_user_id: int | None = None
    summary: str
    confidence: float
    draft_letter: str
    is_meaningful: bool
    contains_profanity: bool
    moderation_reason: str | None = None


_client = None


def _get_client() -> genai.Client:

    global _client

    if _client is None:

        if not GEMINI_API_KEY:
            raise AIAnalysisError(
                "Не задан GEMINI_API_KEY в backend/.env — "
                "получите бесплатный ключ на https://aistudio.google.com/apikey"
            )

        _client = genai.Client(api_key=GEMINI_API_KEY)

    return _client


def _build_prompt(description: str, specialists: list[dict]) -> str:

    specialists_text = "\n".join(
        f"- id={s['id']}: {s['full_name']}"
        for s in specialists
    ) or "(нет доступных специалистов, всегда возвращай null)"

    return f"""Ты — ассистент CRM-системы приёма сообщений граждан по \
вопросам качества мобильной связи и интернета в Акмолинской области.

Проанализируй текст сообщения ниже и верни результат строго по заданной \
схеме, со следующими полями:

- "category": ровно одна из строк {json.dumps(CATEGORIES, ensure_ascii=False)}
- "operator": ровно одна из строк {json.dumps(OPERATORS, ensure_ascii=False)}. \
Важно: "Altel"/"Алтел" — это тот же оператор, что и Tele2 (один \
холдинг, просто другое название бренда) — если в тексте упоминается \
именно Altel/Алтел, указывай "Tele2". Аналогично "Актив"/"Activ" — \
это тот же оператор, что и Kcell — указывай "Kcell".
- "priority": ровно одна из строк {json.dumps(PRIORITIES, ensure_ascii=False)}
- "assigned_user_id": число id наиболее подходящего специалиста из списка \
ниже, или null, если не уверен
- "summary": краткое резюме сообщения на русском (1-2 предложения)
- "confidence": число от 0 до 1 — насколько ты уверен в категории и операторе
- "draft_letter": черновик официального письма оператору связи с описанием \
проблемы и просьбой её устранить, официальный деловой стиль на русском, \
без указания конкретного ФИО получателя (используй обращение \
"Уважаемые коллеги,"). ВАЖНО: не добавляй никакую подпись, закрывающую \
формулу вежливости или указание отправителя в конце (без "С уважением", \
без "[Ваш отдел]", без имени/должности/организации-отправителя и т.п.) — \
письмо уходит без правки как есть, поэтому заканчивай текст сразу после \
сути обращения, без завершающего блока
- "is_meaningful": true/false — является ли текст осмысленным реальным \
сообщением о проблеме связи (false для пустых отписок, случайного набора \
символов, спама, рекламы, текста не по теме и т.п.)
- "contains_profanity": true/false — есть ли в тексте нецензурная лексика \
или оскорбления
- "moderation_reason": если is_meaningful=false или contains_profanity=true, \
кратко на русском объясни, почему (например: "текст не содержит описания \
проблемы" или "присутствует нецензурная лексика"), иначе null

Список специалистов (для поля assigned_user_id):
{specialists_text}

Текст сообщения:
\"\"\"{description}\"\"\""""


def _analyze_with_groq(description: str, specialists: list[dict]) -> dict:
    """
    Резервный анализ через Groq (OpenAI-совместимый API) — только
    когда Gemini не ответил. У Groq нет родной поддержки Pydantic-
    схемы, как у Gemini, поэтому просим строгий JSON текстом в
    промпте и разбираем/проверяем результат вручную через
    TicketAnalysis (та же модель, что и для Gemini).
    """

    if not GROQ_API_KEY:
        raise AIAnalysisError(
            "Не задан GROQ_API_KEY в backend/.env — резервный вариант "
            "недоступен. Получить ключ: https://console.groq.com/keys"
        )

    prompt = _build_prompt(description, specialists) + (
        "\n\nОтветь СТРОГО одним JSON-объектом верхнего уровня (НЕ "
        "массивом/списком, без квадратных скобок снаружи), без "
        "пояснений и без markdown-обёртки (без ```), с ключами ровно "
        "такими именами: category, operator, priority, "
        "assigned_user_id, summary, confidence, draft_letter, "
        "is_meaningful, contains_profanity, moderation_reason."
    )

    try:
        logger.info("Sending fallback request to Groq API...")
        response = httpx.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.2
            },
            timeout=30
        )
        response.raise_for_status()
        logger.info("Received response from Groq API")

    except Exception as error:
        logger.error(f"Groq API error: {type(error).__name__}: {error}")
        raise AIAnalysisError(
            f"Ошибка обращения к Groq (резервный вариант): {error}"
        ) from error

    try:
        content = response.json()["choices"][0]["message"]["content"]
        data = json.loads(content)

        # Некоторые модели иногда своевольничают с форматом и
        # оборачивают объект в список ([{...}] вместо {...}), хотя
        # промпт просит строго один объект — подстрахуемся.
        if isinstance(data, list):
            if len(data) == 1 and isinstance(data[0], dict):
                data = data[0]
            else:
                raise ValueError(
                    f"ожидался один JSON-объект, получен список "
                    f"из {len(data)} элементов"
                )

        return _clean_analysis_result(
            TicketAnalysis(**data).model_dump()
        )

    except Exception as error:
        logger.error(f"Failed to parse Groq response: {error}")
        raise AIAnalysisError(
            f"Groq вернул невалидный ответ: {error}"
        ) from error


def analyze_ticket(description: str, specialists: list[dict]) -> dict:
    """
    Отправляет текст сообщения модели Gemini и возвращает разобранный
    словарь с результатом анализа.

    Поднимает AIAnalysisError при любой проблеме (нет ключа, нет сети,
    невалидный ответ) — вызывающий код должен обрабатывать эту ошибку
    так, чтобы не ломать создание сообщения.
    """
    logger.info(f"Starting AI analysis for description: {description[:100]}...")
    logger.info(f"Using model: {GEMINI_MODEL}")
    logger.info(f"GEMINI_API_KEY present: {bool(GEMINI_API_KEY)}")
    
    try:
        client = _get_client()
    except AIAnalysisError as error:
        logger.error(f"Failed to get client: {error}")
        raise
    
    prompt = _build_prompt(description, specialists)

    try:
        logger.info("Sending request to Gemini API...")
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": TicketAnalysis,
                "temperature": 0.2,
            },
        )
        logger.info("Received response from Gemini API")

    except Exception as error:
        logger.error(f"Gemini API error: {type(error).__name__}: {error}")

        if GROQ_API_KEY:
            logger.warning(
                "Gemini не ответил, пробую резервный вариант через Groq..."
            )
            try:
                return _analyze_with_groq(description, specialists)
            except AIAnalysisError as groq_error:
                logger.error(f"Groq тоже не сработал: {groq_error}")
                raise AIAnalysisError(
                    f"Ошибка обращения к Gemini: {error}. Резервный "
                    f"вариант (Groq) тоже не сработал: {groq_error}"
                ) from error

        raise AIAnalysisError(
            f"Ошибка обращения к Gemini: {error}"
        ) from error

    parsed = getattr(response, "parsed", None)

    if isinstance(parsed, TicketAnalysis):
        logger.info("Successfully parsed Gemini response")
        return _clean_analysis_result(parsed.model_dump())

    try:
        logger.info("Attempting to parse response as JSON")
        return _clean_analysis_result(json.loads(response.text))
    except (ValueError, TypeError, AttributeError) as error:
        logger.error(f"Failed to parse response: {error}")
        raise AIAnalysisError(
            f"Модель вернула невалидный JSON: {error}"
        ) from error
