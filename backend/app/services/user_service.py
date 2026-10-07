import random
from datetime import datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.roles import CITIZEN_ROLE_NAME
from app.core.security import hash_password
from app.models.email_verification_code import EmailVerificationCode
from app.models.role import Role
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import RegisterRequest
from app.schemas.user import UserCreate, UserUpdate
from app.services.email_service import EmailSendError, send_verification_code

CODE_TTL_MINUTES = 10
CODE_RESEND_COOLDOWN_SECONDS = 60
CODE_MAX_ATTEMPTS = 5


class UserService:

    def __init__(self):
        self.repository = UserRepository()

    def send_registration_code(
        self,
        db: Session,
        email: str
    ) -> None:
        """
        Генерирует и отправляет код подтверждения на email перед
        регистрацией. Ничего не пишет в БД, пока письмо реально не
        отправлено — чтобы не плодить коды, которые никуда не дошли.
        """

        if self.repository.get_by_email(db, email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с таким email уже существует"
            )

        existing = (
            db.query(EmailVerificationCode)
            .filter(EmailVerificationCode.email == email)
            .first()
        )

        if existing:
            seconds_since_sent = (
                datetime.utcnow() - existing.created_at.replace(tzinfo=None)
            ).total_seconds()

            if seconds_since_sent < CODE_RESEND_COOLDOWN_SECONDS:
                wait_seconds = int(
                    CODE_RESEND_COOLDOWN_SECONDS - seconds_since_sent
                )
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=(
                        "Код уже отправлен. Повторную отправку можно "
                        f"запросить через {wait_seconds} сек."
                    )
                )

        code = f"{random.randint(0, 999999):06d}"

        try:
            send_verification_code(email, code)
        except EmailSendError as error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Не удалось отправить письмо с кодом: {error}"
            ) from error

        if existing:
            existing.code = code
            existing.attempts = 0
            existing.expires_at = (
                datetime.utcnow() + timedelta(minutes=CODE_TTL_MINUTES)
            )
            existing.created_at = datetime.utcnow()
        else:
            db.add(
                EmailVerificationCode(
                    email=email,
                    code=code,
                    attempts=0,
                    expires_at=(
                        datetime.utcnow()
                        + timedelta(minutes=CODE_TTL_MINUTES)
                    )
                )
            )

        db.commit()

    def _consume_verification_code(
        self,
        db: Session,
        email: str,
        code: str
    ) -> None:

        record = (
            db.query(EmailVerificationCode)
            .filter(EmailVerificationCode.email == email)
            .first()
        )

        if record is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Код не запрошен или уже истёк. Запросите новый код."
            )

        if record.expires_at.replace(tzinfo=None) < datetime.utcnow():
            db.delete(record)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Срок действия кода истёк. Запросите новый код."
            )

        if record.attempts >= CODE_MAX_ATTEMPTS:
            db.delete(record)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Слишком много неверных попыток. Запросите новый код."
            )

        if record.code != code:
            record.attempts += 1
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Неверный код подтверждения"
            )

        db.delete(record)
        db.commit()

    def register(
        self,
        db: Session,
        data: RegisterRequest
    ) -> User:
        """
        Публичная регистрация жителя. Роль всегда фиксированная
        (CITIZEN_ROLE_NAME) — выбрать другую роль через этот метод
        нельзя, это делает только администратор через /users.
        Требует заранее подтверждённый код, отправленный на email
        (см. send_registration_code).
        """

        if self.repository.get_by_username(db, data.username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с таким логином уже существует"
            )

        if self.repository.get_by_email(db, data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с таким email уже существует"
            )

        self._consume_verification_code(db, data.email, data.code)

        citizen_role = (
            db.query(Role)
            .filter(Role.name == CITIZEN_ROLE_NAME)
            .first()
        )

        if citizen_role is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=(
                    "Роль для регистрации не настроена. "
                    "Обратитесь к администратору."
                )
            )

        user = User(
            full_name=data.full_name,
            username=data.username,
            email=data.email,
            password_hash=hash_password(data.password),
            role_id=citizen_role.id,
            is_active=True
        )

        return self.repository.create(
            db,
            user
        )

    def get_all(
        self,
        db: Session
    ):
        return self.repository.get_all(db)

    def get_by_id(
        self,
        db: Session,
        user_id: int
    ):
        return self.repository.get_by_id(
            db,
            user_id
        )

    def create(
        self,
        db: Session,
        data: UserCreate
    ) -> User:

        if self.repository.get_by_username(db, data.username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с таким логином уже существует"
            )

        if self.repository.get_by_email(db, data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с таким email уже существует"
            )

        user = User(
            full_name=data.full_name,
            username=data.username,
            email=data.email,
            password_hash=hash_password(data.password),
            role_id=data.role_id,
            is_active=data.is_active
        )

        return self.repository.create(
            db,
            user
        )

    def update(
        self,
        db: Session,
        user_id: int,
        data: UserUpdate
    ) -> User:

        user = self.get_by_id(db, user_id)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден"
            )

        update_data = data.model_dump(exclude_unset=True)

        if "password" in update_data:
            password = update_data.pop("password")
            if password:
                user.password_hash = hash_password(password)
                # Админ меняет пароль обычно именно для того, чтобы
                # вернуть человеку доступ — если аккаунт был временно
                # заблокирован из-за неверных попыток входа, снимаем
                # блокировку тоже, иначе новый пароль всё равно не
                # даст войти до истечения 15 минут.
                user.failed_login_attempts = 0
                user.locked_until = None

        for field, value in update_data.items():
            setattr(user, field, value)

        return self.repository.update(db, user)

    def delete(
        self,
        db: Session,
        user: User
    ):
        self.repository.delete(
            db,
            user
        )
