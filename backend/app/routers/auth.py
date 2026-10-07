from datetime import datetime, timedelta

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    status
)
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer
)
from sqlalchemy.orm import Session

from app.core.rate_limit import is_ip_rate_limited, register_login_attempt
from app.core.roles import CITIZEN_ROLE_NAME
from app.core.security import (
    create_access_token,
    decode_access_token,
    verify_password
)
from app.database import get_db
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import (
    CurrentUserResponse,
    LoginRequest,
    RegisterRequest,
    SendCodeRequest,
    TokenResponse
)
from app.schemas.user import UserResponse
from app.services.user_service import UserService

router = APIRouter(
    prefix="/auth",
    tags=["Авторизация"]
)

bearer_scheme = HTTPBearer(
    auto_error=False
)

LOGIN_MAX_ATTEMPTS = 5
LOGIN_LOCKOUT_MINUTES = 15

user_repository = UserRepository()
user_service = UserService()


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(
        bearer_scheme
    ),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Необходима авторизация",
        headers={
            "WWW-Authenticate": "Bearer"
        }
    )

    if credentials is None:
        raise credentials_exception

    try:
        payload = decode_access_token(
            credentials.credentials
        )

        username = payload.get("sub")

        if not username:
            raise credentials_exception

    except ValueError:
        raise credentials_exception

    user = user_repository.get_by_username(
        db,
        username
    )

    if user is None or not user.is_active:
        raise credentials_exception

    return user


def require_roles(*allowed_roles: str):
    """
    Зависимость FastAPI: пропускает только пользователей,
    чья роль входит в allowed_roles.
    Пример: Depends(require_roles("Администратор"))
    """
    def checker(
        current_user: User = Depends(get_current_user)
    ) -> User:
        if current_user.role.name not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Недостаточно прав для этого действия"
            )
        return current_user

    return checker


def require_staff(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Зависимость FastAPI: пропускает любую роль, КРОМЕ обычного
    пользователя (жителя). Не привязана к конкретному списку
    сотрудничьих ролей (Администратор/Руководитель/Специалист
    и т.д.) — так что новая сотрудничья роль не потребует правок
    здесь.
    """
    if current_user.role.name == CITIZEN_ROLE_NAME:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для этого действия"
        )
    return current_user


@router.post(
    "/register/send-code",
    status_code=status.HTTP_204_NO_CONTENT
)
def send_registration_code(
    data: SendCodeRequest,
    db: Session = Depends(get_db)
):
    """
    Шаг 1 регистрации: отправляет код подтверждения на email.
    Доступно без авторизации.
    """
    user_service.send_registration_code(db, data.email)


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
def register(
    data: RegisterRequest,
    db: Session = Depends(get_db)
):
    """
    Шаг 2 регистрации: создаёт аккаунт, требует код из шага 1.
    Доступна без авторизации.
    Роль назначается автоматически (обычный пользователь) —
    зарегистрироваться администратором или специалистом нельзя.
    """
    return user_service.register(db, data)


@router.post(
    "/login",
    response_model=TokenResponse
)
def login(
    login_data: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    client_ip = request.client.host if request.client else "unknown"

    if is_ip_rate_limited(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                "Слишком много попыток входа с вашего адреса. "
                "Попробуйте позже."
            )
        )

    register_login_attempt(client_ip)

    user = user_repository.get_by_username(
        db,
        login_data.username
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль"
        )

    now = datetime.utcnow()

    if user.locked_until and user.locked_until.replace(tzinfo=None) > now:

        minutes_left = max(
            1,
            int(
                (user.locked_until.replace(tzinfo=None) - now)
                .total_seconds() // 60
            ) + 1
        )

        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=(
                "Аккаунт временно заблокирован из-за подозрительной "
                f"активности. Попробуйте через {minutes_left} мин."
            )
        )

    if not verify_password(
        login_data.password,
        user.password_hash
    ):
        user.failed_login_attempts += 1

        if user.failed_login_attempts >= LOGIN_MAX_ATTEMPTS:
            user.locked_until = now + timedelta(
                minutes=LOGIN_LOCKOUT_MINUTES
            )
            user.failed_login_attempts = 0
            db.commit()

            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail=(
                    "Слишком много неверных попыток. Аккаунт "
                    f"заблокирован на {LOGIN_LOCKOUT_MINUTES} мин."
                )
            )

        db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь отключён"
        )

    # Успешный вход — сбрасываем счётчики неудачных попыток.
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()

    token = create_access_token(
        subject=user.username,
        additional_claims={
            "user_id": user.id,
            "role_id": user.role_id
        }
    )

    return TokenResponse(
        access_token=token
    )


@router.get(
    "/me",
    response_model=CurrentUserResponse
)
def get_me(
    current_user: User = Depends(get_current_user)
):
    return CurrentUserResponse(
        id=current_user.id,
        full_name=current_user.full_name,
        username=current_user.username,
        email=current_user.email,
        role_id=current_user.role_id,
        role_name=current_user.role.name,
        is_active=current_user.is_active
    )