"""
Разовый скрипт: создаёт роли (если их ещё нет) и первого администратора.

Запуск (из папки backend, при активированном venv):
    python seed_admin.py

Логин первого администратора: admin / admin123
После первого входа обязательно смените пароль через страницу "Пользователи".
"""
from app.core.security import hash_password
from app.database import SessionLocal
from app.models.role import Role
from app.models.user import User

DEFAULT_ROLES = [
    ("Администратор", "Полный доступ к системе"),
    ("Специалист", "Обрабатывает сообщения"),
    ("Пользователь", "Создаёт обращения и видит только свои"),
]

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"


def run():
    db = SessionLocal()

    try:
        role_by_name = {}

        for name, description in DEFAULT_ROLES:
            role = db.query(Role).filter(Role.name == name).first()

            if role is None:
                role = Role(name=name, description=description)
                db.add(role)
                db.commit()
                db.refresh(role)
                print(f"Создана роль: {name}")
            else:
                print(f"Роль уже существует: {name}")

            role_by_name[name] = role

        admin_role = role_by_name["Администратор"]

        existing_admin = (
            db.query(User)
            .filter(User.username == ADMIN_USERNAME)
            .first()
        )

        if existing_admin:
            print("Пользователь admin уже существует, пропускаю.")
            return

        admin_user = User(
            full_name="Администратор системы",
            username=ADMIN_USERNAME,
            email="admin@example.com",
            password_hash=hash_password(ADMIN_PASSWORD),
            role_id=admin_role.id,
            is_active=True,
        )

        db.add(admin_user)
        db.commit()

        print(
            f"Создан администратор: логин='{ADMIN_USERNAME}', "
            f"пароль='{ADMIN_PASSWORD}'"
        )
        print("ОБЯЗАТЕЛЬНО смените пароль после первого входа.")

    finally:
        db.close()


if __name__ == "__main__":
    run()
