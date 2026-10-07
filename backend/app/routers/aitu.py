
import os

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.rate_limit import (
    is_public_ticket_rate_limited,
    register_public_ticket_attempt
)
from app.core.roles import CITIZEN_ROLE_NAME
from app.core.security import hash_password
from app.database import get_db
from app.models.role import Role
from app.models.user import User
from app.schemas.aitu import AituTicketCreate
from app.schemas.ticket import TicketCreate, TicketResponse
from app.services.ticket_service import TicketService

router = APIRouter(
    prefix="/aitu",
    tags=["Aitu"]
)

ticket_service = TicketService()

AITU_ACCOUNT_USERNAME = "aitu_miniapp"


def _get_or_create_aitu_account(db: Session) -> User:
    """
    Единый служебный аккаунт, от имени которого создаются обращения
    из мини-приложения Aitu — тот же принцип, что и у Telegram-бота
    (app/telegram_bot.py, _get_or_create_bot_account).
    """

    user = (
        db.query(User)
        .filter(User.username == AITU_ACCOUNT_USERNAME)
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
        full_name="Мини-приложение Aitu Smart Aqmola",
        username=AITU_ACCOUNT_USERNAME,
        email="aitu-miniapp@smart-aqmola-service.kz",
        password_hash=hash_password(os.urandom(16).hex()),
        role_id=role.id,
        is_active=True
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


@router.post(
    "/tickets",
    response_model=TicketResponse,
    status_code=status.HTTP_201_CREATED
)
def create_ticket_from_aitu(
    data: AituTicketCreate,
    request: Request,
    db: Session = Depends(get_db)
):

    client_ip = request.client.host if request.client else "unknown"

    if is_public_ticket_rate_limited(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                "Слишком много обращений с этого адреса за последний "
                "час — попробуйте позже."
            )
        )

    register_public_ticket_attempt(client_ip)

    aitu_account = _get_or_create_aitu_account(db)

    ticket_data = TicketCreate(
        applicant=data.applicant,
        phone=data.phone,
        description=data.description,
        source="Aitu",
        district=data.district,
        operator=data.operator
    )

    return ticket_service.create_ticket(db, ticket_data, aitu_account)
