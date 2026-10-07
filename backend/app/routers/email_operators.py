from fastapi import APIRouter, Depends

from sqlalchemy.orm import Session

from app.database import get_db
from app.routers.auth import get_current_user, require_roles
from app.schemas.email_operator import (
    EmailOperatorCreate,
    EmailOperatorResponse,
    EmailOperatorUpdate
)
from app.services.email_operator_service import EmailOperatorService

router = APIRouter(
    prefix="/email-operators",
    tags=["Операторы рассылки"],
    dependencies=[Depends(get_current_user)]
)

service = EmailOperatorService()


@router.get(
    "",
    response_model=list[EmailOperatorResponse]
)
def get_email_operators(
    db: Session = Depends(get_db)
):
    return service.get_all(db)


@router.post(
    "",
    response_model=EmailOperatorResponse,
    status_code=201,
    dependencies=[Depends(require_roles("Администратор"))]
)
def create_email_operator(
    data: EmailOperatorCreate,
    db: Session = Depends(get_db)
):
    return service.create(db, data)


@router.patch(
    "/{operator_id}",
    response_model=EmailOperatorResponse,
    dependencies=[Depends(require_roles("Администратор"))]
)
def update_email_operator(
    operator_id: int,
    data: EmailOperatorUpdate,
    db: Session = Depends(get_db)
):
    return service.update(db, operator_id, data)


@router.delete(
    "/{operator_id}",
    status_code=204,
    dependencies=[Depends(require_roles("Администратор"))]
)
def delete_email_operator(
    operator_id: int,
    db: Session = Depends(get_db)
):
    service.delete(db, operator_id)
