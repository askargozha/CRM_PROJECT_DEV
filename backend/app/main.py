import asyncio
import logging
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.core.uploads import UPLOADS_DIR
from app.database import Base, engine, SessionLocal
from app.models.ticket import Ticket
from app.routers.tickets import router as tickets_router
from app.routers import users
from app.routers.auth import router as auth_router
from app.routers.roles import router as roles_router
from app.routers.email_operators import router as email_operators_router
from app.routers.incoming_emails import router as incoming_emails_router
from app.routers.aitu import router as aitu_router
from app.routers.public import router as public_router
from app.services.incoming_email_service import EmailFetchError, fetch_new_emails
from app.services.external_crm_sync import sync_external_appeals
from app.telegram_bot import run_bot_polling

logger = logging.getLogger("main")

# Как часто фоново проверять почту на новые ответы операторов.
# Ручная кнопка "Проверить почту" на странице всё равно работает
# независимо от этого таймера.
INCOMING_EMAIL_POLL_INTERVAL_SECONDS = 120

# Как часто забирать обращения из внешней CRM (crm.smartaqmola.kz).
# Не срабатывает вообще, если не заданы EXTERNAL_CRM_API_URL/
# EXTERNAL_CRM_API_TOKEN — см. app/services/external_crm_sync.py.
EXTERNAL_CRM_SYNC_INTERVAL_SECONDS = 600

# Выключатель фоновой синхронизации с внешней CRM (ЕКЦ 109) — на
# случай если её попросят на время (или насовсем) отключить, не трогая
# код: достаточно добавить в Render переменную окружения
# EXTERNAL_CRM_SYNC_ENABLED=false и перезапустить сервис. Обратно
# включается точно так же — убрать переменную или поставить true,
# код менять не нужно.
EXTERNAL_CRM_SYNC_ENABLED = os.getenv(
    "EXTERNAL_CRM_SYNC_ENABLED", "true"
).lower() in ("1", "true", "yes")

# Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CRM API",
    description=(
        "API CRM-системы для обработки обращений "
        "по вопросам связи"
    ),
    version="1.0.0"
)

# Дополнительные разрешённые адреса (домен/IP реального сервера,
# адрес фронтенда на Render и т.п.) — задаются через .env, через
# запятую, например:
#   EXTRA_ALLOWED_ORIGINS=https://crm-project-frontend-3etk.onrender.com
# Ничего не задано — ничего лишнего не добавляется, локальная работа
# не меняется.
_extra_origins = [
    origin.strip()
    for origin in os.getenv("EXTRA_ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        *_extra_origins
    ],
    # Плюс любой адрес локальной сети на порту 5173 — чтобы можно было
    # открыть сайт с другого компьютера в том же Wi-Fi/офисе, не читая
    # каждый раз конкретный IP в код.
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):5173",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Фото, приложенные к обращениям (сейчас — только из Telegram-бота),
# сохраняются на диск в эту папку и раздаются напрямую по /uploads/...
os.makedirs(UPLOADS_DIR, exist_ok=True)

app.mount(
    "/uploads",
    StaticFiles(directory=UPLOADS_DIR),
    name="uploads"
)

app.include_router(tickets_router)
app.include_router(users.router)
app.include_router(auth_router)
app.include_router(roles_router)
app.include_router(email_operators_router)
app.include_router(incoming_emails_router)
app.include_router(aitu_router)
app.include_router(public_router)

# ---------------------------------------------------------------------------
# Встраиваемый JS-виджет аналитики (для сторонних сайтов-партнёров)
# ---------------------------------------------------------------------------
# Основной CORS выше (allow_origins + allow_origin_regex) намеренно
# держит список разрешённых адресов закрытым — там же ходят запросы
# с Authorization: Bearer <token> к обычным (не публичным) ручкам.
#
# Для виджета же нужно ровно обратное: он должен грузиться и получать
# данные с ЛЮБОГО чужого сайта, куда его вставят как <script> — заранее
# неизвестно, какой у партнёра домен. Ужесточать проверку тут не нужно,
# так как отдаётся тот же самый урезанный TicketAnalyticsItem без ФИО/
# телефона (см. app/routers/public.py) — те же данные, что уже открыты
# на /public/analytics-summary для собственного фронтенда.
#
# Поэтому CORS для этой части вынесен в отдельное under-приложение со
# своей политикой (allow_origins=["*"]), не трогая общий CORS выше:
# FastAPI/Starlette применяет CORSMiddleware по объекту приложения
# целиком, а не по отдельным роутам, так что для другой политики нужен
# именно отдельный под-app, примонтированный на свой префикс.
widget_api = FastAPI(
    title="CRM Public Widget API",
    docs_url=None,
    redoc_url=None,
    openapi_url=None
)
widget_api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    # Ни один запрос виджета не должен зависеть от кук/сессии — сайт
    # партнёра для нас чужой источник, credentials тут не нужны и не
    # должны быть нужны (сам API уже и так работает на Bearer-токенах,
    # а публичная аналитика вообще без токена).
    allow_credentials=False,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"]
)
# Тот же самый роутер, что и на основном /public — просто с другой
# CORS-политикой на другом префиксе. Данные, доступ, поведение ручки
# не отличаются.
widget_api.include_router(public_router)

app.mount("/widget-api", widget_api)

_WIDGET_JS_PATH = Path(__file__).resolve().parent / "static" / "widget.js"


@app.get(
    "/widget.js",
    tags=["Встраиваемый виджет"],
    include_in_schema=False
)
def get_widget_script():
    """
    Отдаёт сам скрипт виджета. Namespace здесь не важен (партнёр
    вставляет ровно тот тег <script src="...">, что мы ему дали) —
    отдельного CORS для этого GET не нужно: браузер загружает <script
    src="..."> как обычный ресурс, без разбора CORS-заголовков, в
    отличие от fetch() внутри самого скрипта (тот идёт на
    /widget-api/... и обслуживается CORS-политикой выше).
    """
    return FileResponse(
        _WIDGET_JS_PATH,
        media_type="application/javascript",
        headers={"Cache-Control": "public, max-age=300"}
    )


async def _poll_incoming_emails_loop() -> None:

    while True:

        await asyncio.sleep(INCOMING_EMAIL_POLL_INTERVAL_SECONDS)

        db = SessionLocal()
        try:
            fetched, matched = await asyncio.to_thread(
                fetch_new_emails, db
            )
            if fetched:
                logger.info(
                    "Фоновая проверка почты: забрано %s писем, "
                    "привязано к обращениям %s",
                    fetched, matched
                )
        except EmailFetchError as error:
            # Не настроена почта или недоступна — не роняем сервер,
            # просто пробуем ещё раз через тот же интервал.
            logger.warning("Фоновая проверка почты не удалась: %s", error)
        except Exception:
            logger.exception("Непредвиденная ошибка фоновой проверки почты")
        finally:
            db.close()


async def _poll_external_crm_loop() -> None:

    while True:

        await asyncio.sleep(EXTERNAL_CRM_SYNC_INTERVAL_SECONDS)

        try:
            await asyncio.to_thread(
                sync_external_appeals, SessionLocal
            )
        except Exception:
            logger.exception(
                "Непредвиденная ошибка фоновой синхронизации с "
                "внешней CRM"
            )


@app.on_event("startup")
async def _start_background_tasks() -> None:

    asyncio.create_task(_poll_incoming_emails_loop())

    if EXTERNAL_CRM_SYNC_ENABLED:
        asyncio.create_task(_poll_external_crm_loop())
    else:
        logger.info(
            "EXTERNAL_CRM_SYNC_ENABLED=false — синхронизация с внешней "
            "CRM (ЕКЦ 109) отключена, фоновый пул не запускается"
        )

    # Локально (docker compose) бот работает отдельным контейнером —
    # тогда эту переменную не задают, и здесь ничего не происходит.
    # На площадках без отдельного бесплатного "воркера" для бота
    # (например, Render) ставим RUN_BOT_IN_BACKEND=true в .env — тогда
    # бот запускается прямо здесь же, внутри процесса backend.
    if os.getenv("RUN_BOT_IN_BACKEND", "").lower() in ("1", "true", "yes"):
        asyncio.create_task(run_bot_polling())
        logger.info(
            "RUN_BOT_IN_BACKEND=true — Telegram-бот запускается "
            "внутри backend-процесса"
        )


@app.get(
    "/",
    tags=["Система"]
)
def root():
    return {
        "message": "CRM API работает"
    }