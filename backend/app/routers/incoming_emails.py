from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.roles import ADMIN_ROLE_NAME, SPECIALIST_ROLE_NAME
from app.database import get_db
from app.models.incoming_email import IncomingEmail
from app.repositories.incoming_email_repository import IncomingEmailRepository
from app.routers.auth import get_current_user, require_roles
from app.schemas.incoming_email import FetchEmailsResponse, IncomingEmailResponse
from app.services.incoming_email_service import EmailFetchError, fetch_new_emails

router = APIRouter(
    prefix="/incoming-emails",
    tags=["Входящие письма"],
    dependencies=[
        Depends(get_current_user),
        Depends(require_roles(ADMIN_ROLE_NAME, SPECIALIST_ROLE_NAME))
    ]
)

repository = IncomingEmailRepository()


@router.get(
    "",
    response_model=list[IncomingEmailResponse]
)
def get_incoming_emails(
    db: Session = Depends(get_db)
):
    return repository.get_all(db)


@router.post(
    "/fetch",
    response_model=FetchEmailsResponse
)
def fetch_incoming_emails(
    db: Session = Depends(get_db)
):
    """
    Проверяет почтовый ящик по IMAP и забирает новые письма
    (в первую очередь — ответы операторов связи).
    """
    try:
        fetched, matched = fetch_new_emails(db)
    except EmailFetchError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error)
        ) from error

    return FetchEmailsResponse(fetched=fetched, matched=matched)


@router.patch(
    "/{email_id}/read",
    response_model=IncomingEmailResponse
)
def mark_email_read(
    email_id: int,
    db: Session = Depends(get_db)
):
    email_record = repository.get_by_id(db, email_id)

    if not email_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Письмо не найдено"
        )

    email_record.is_read = True

    return repository.update(db, email_record)
