import os

# backend/uploads — общая папка для файлов, приложенных к обращениям
# (сейчас единственный источник — фото из Telegram-бота). Раздаётся
# наружу через StaticFiles на /uploads/... (см. app/main.py).
UPLOADS_DIR = os.path.join(
    os.path.dirname(
        os.path.dirname(
            os.path.dirname(os.path.abspath(__file__))
        )
    ),
    "uploads"
)

os.makedirs(UPLOADS_DIR, exist_ok=True)
