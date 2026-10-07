"""
Тестовые данные для локальной разработки: сотрудники всех ролей и
~60 вымышленных обращений за последний месяц (разные районы,
категории, операторы, статусы) — чтобы списки, фильтры и аналитика
сразу были не пустыми.

Только для разработки! На боевом сервере не запускать.

Запуск (локальный docker compose):
    docker compose -f docker-compose.dev.yml exec backend python seed_demo.py

Повторный запуск ничего не дублирует: если тестовые обращения уже
есть, скрипт их не трогает.
"""
import random
from datetime import datetime, timedelta

from app.core.security import hash_password
from app.database import SessionLocal
from app.models.role import Role
from app.models.ticket import Ticket
from app.models.user import User

# Метка в тексте тестовых обращений — по ней скрипт узнаёт, что уже
# запускался, а человек видит, что обращение не настоящее.
DEMO_MARK = "[тест]"
DEMO_TICKETS = 60

# Логины для входа при разработке (admin / admin123 создаёт seed_admin.py).
DEMO_USERS = [
    ("specialist", "specialist123", "Тестовый специалист", "Специалист"),
    ("user", "user123", "Тестовый пользователь", "Пользователь"),
]

DISTRICTS = [
    "Кокшетау", "Степногорск", "Щучинск", "Аккольский", "Аршалынский",
    "Бурабайский", "Зерендинский", "Целиноградский", "Шортандинский",
    "Есильский", "Атбасарский",
]

CATEGORIES = [
    "Плохое качество связи",
    "Нет доступа к интернету",
    "Медленный интернет",
    "Обрыв линии / авария",
    "Проблема с SIM-картой",
    "Тарификация и биллинг",
    "Иное",
]

OPERATORS = ["Kcell", "Beeline", "Tele2", "Казахтелеком", "Другое / не указан"]
PRIORITIES = ["Низкий", "Средний", "Высокий"]
STATUSES = ["Новое", "В работе", "Закрыто"]
SOURCES = ["Веб-форма", "Telegram-бот", "Aitu"]

FIRST_NAMES = ["Айгерим", "Ерлан", "Динара", "Нурлан", "Светлана", "Асхат", "Мадина", "Сергей"]
LAST_NAMES = ["Тестова", "Примеров", "Демонова", "Образцов", "Выдумкина", "Фиктивов"]

DESCRIPTIONS = {
    "Плохое качество связи": "В селе постоянно пропадает мобильная связь, звонки обрываются.",
    "Нет доступа к интернету": "Третий день нет интернета, на линии оператора не отвечают.",
    "Медленный интернет": "Скорость интернета вечером падает почти до нуля.",
    "Обрыв линии / авария": "После ветра оборван кабель на нашей улице.",
    "Проблема с SIM-картой": "SIM-карта перестала регистрироваться в сети.",
    "Тарификация и биллинг": "Списали деньги за услугу, которую я не подключал.",
    "Иное": "Прошу установить вышку связи в нашем посёлке.",
}


def ensure_users(db) -> None:
    for username, password, full_name, role_name in DEMO_USERS:
        if db.query(User).filter(User.username == username).first():
            print(f"Пользователь {username} уже есть, пропускаю.")
            continue
        role = db.query(Role).filter(Role.name == role_name).first()
        if role is None:
            raise SystemExit(f"Нет роли «{role_name}» — сначала запустите seed_admin.py")
        db.add(User(
            full_name=full_name,
            username=username,
            email=f"{username}@example.com",
            password_hash=hash_password(password),
            role_id=role.id,
            is_active=True,
        ))
        db.commit()
        print(f"Создан {role_name}: {username} / {password}")


def create_tickets(db) -> None:
    if db.query(Ticket).filter(Ticket.description.like(f"%{DEMO_MARK}%")).count():
        print("Тестовые обращения уже есть, пропускаю.")
        return

    rng = random.Random(42)  # одинаковые данные у всех разработчиков
    now = datetime.now()

    for _ in range(DEMO_TICKETS):
        category = rng.choice(CATEGORIES)
        created = now - timedelta(days=rng.randint(0, 30), hours=rng.randint(0, 23))
        operator = rng.choice(OPERATORS)
        priority = rng.choice(PRIORITIES)
        db.add(Ticket(
            applicant=f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}",
            phone=f"+7 700 000 {rng.randint(10, 99)} {rng.randint(10, 99)}",
            description=f"{DESCRIPTIONS[category]} {DEMO_MARK}",
            source=rng.choice(SOURCES),
            district=rng.choice(DISTRICTS),
            category=category,
            operator=operator,
            priority=priority,
            status=rng.choice(STATUSES),
            ai_category=category,
            ai_operator=operator,
            ai_priority=priority,
            ai_summary=DESCRIPTIONS[category],
            ai_confidence=round(rng.uniform(0.6, 0.98), 2),
            ai_processed=True,
            ai_is_meaningful=True,
            ai_contains_profanity=False,
            created_date=created.date(),
            created_at=created,
            updated_at=created,
        ))

    db.commit()
    print(f"Создано тестовых обращений: {DEMO_TICKETS}")


def run() -> None:
    db = SessionLocal()
    try:
        ensure_users(db)
        create_tickets(db)
    finally:
        db.close()


if __name__ == "__main__":
    run()
