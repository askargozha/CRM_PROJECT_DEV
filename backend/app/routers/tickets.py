import os
import tempfile
import uuid
from datetime import date

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    Response,
    UploadFile,
    status
)
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.routers.auth import get_current_user, require_staff
from app.schemas.ticket import (
    SendEmailRequest,
    TicketAnalyticsItem,
    TicketCreate,
    TicketResponse,
    TicketUpdate
)
from app.schemas.ticket_comment import TicketCommentCreate, TicketCommentResponse
from app.services.report_service import (
    generate_tickets_report_pdf,
    generate_tickets_report_xlsx
)
from app.services.ticket_service import TicketService

router = APIRouter(
    prefix="/tickets",
    tags=["Обращения"],
    dependencies=[Depends(get_current_user)]
)

ticket_service = TicketService()


@router.get(
    "",
    response_model=list[TicketResponse]
)
def get_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return ticket_service.get_all_tickets(db, current_user)
@router.get(
    "/unsent",
    response_model=list[TicketResponse],
    dependencies=[Depends(require_staff)]
)
def get_unsent_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получение списка неотправленных обращений — доступно только сотрудникам.
    """
    return ticket_service.get_unsent_tickets(db, current_user)

# ВАЖНО: должен идти раньше "/{ticket_id}", иначе FastAPI примет
# "analytics-summary" за значение ticket_id.
@router.get(
    "/analytics-summary",
    response_model=list[TicketAnalyticsItem]
)
def get_tickets_analytics_summary(
    db: Session = Depends(get_db)
):
    """
    Общая аналитика доступна всем ролям, включая "Пользователь" —
    но только в урезанном виде (без ФИО/телефона/описания), поэтому
    ограничения по created_by_user_id здесь нет.
    """
    return ticket_service.get_analytics_tickets(db)


# Тоже должен идти раньше "/{ticket_id}" по той же причине.
@router.get(
    "/report",
    dependencies=[Depends(require_staff)]
)
def download_tickets_report(
    date_from: date | None = None,
    date_to: date | None = None,
    format: str = "pdf",
    db: Session = Depends(get_db)
):
    """
    Скачивание отчёта по обращениям — только для сотрудников.
    date_from/date_to необязательны (формат YYYY-MM-DD) — если не
    заданы, отчёт строится за всё время. format — "pdf" (по
    умолчанию) или "xlsx".
    """

    if format == "xlsx":

        xlsx_bytes = generate_tickets_report_xlsx(db, date_from, date_to)

        return Response(
            content=xlsx_bytes,
            media_type=(
                "application/vnd.openxmlformats-officedocument"
                ".spreadsheetml.sheet"
            ),
            headers={
                "Content-Disposition": (
                    'attachment; filename="smart_aqmola_report.xlsx"'
                )
            }
        )

    pdf_bytes = generate_tickets_report_pdf(db, date_from, date_to)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                'attachment; filename="smart_aqmola_report.pdf"'
            )
        }
    )


@router.get(
    "/{ticket_id}",
    response_model=TicketResponse
)
def get_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return ticket_service.get_ticket_by_id(
        db,
        ticket_id,
        current_user
    )


@router.post(
    "",
    response_model=TicketResponse,
    status_code=status.HTTP_201_CREATED
)
def create_ticket(
    ticket_data: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return ticket_service.create_ticket(
        db,
        ticket_data,
        current_user
    )


@router.patch(
    "/{ticket_id}",
    response_model=TicketResponse
)
def update_ticket(
    ticket_id: int,
    ticket_data: TicketUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return ticket_service.update_ticket(
        db,
        ticket_id,
        ticket_data,
        current_user
    )


@router.post(
    "/{ticket_id}/analyze",
    response_model=TicketResponse
)
def reanalyze_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return ticket_service.reanalyze_ticket(
        db,
        ticket_id,
        current_user
    )


@router.post(
    "/{ticket_id}/send-email",
    response_model=TicketResponse
)
def resend_email(
    ticket_id: int,
    data: SendEmailRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    operator_id = data.email_operator_id if data else None
    manual_email = data.manual_email if data else None

    return ticket_service.resend_notification_email(
        db,
        ticket_id,
        current_user,
        operator_id,
        manual_email
    )


@router.post(
    "/{ticket_id}/telegram-reply",
    response_model=TicketResponse
)
def send_telegram_reply(
    ticket_id: int,
    text: str | None = Form(None),
    photo: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ручной ответ сотрудника жителю в тот же Telegram-чат, откуда
    пришло обращение — текст и/или фото (можно только текст, можно
    только фото, можно и то, и другое).

    Специально СИНХРОННЫЙ (не async def) — FastAPI сам выполнит его
    в отдельном потоке, что важно: сервисный слой ниже сам запускает
    asyncio.run() для отправки в Telegram, а это невозможно сделать
    изнутри уже работающего event loop (что случилось бы, останься
    этот роут async).
    """

    photo_path = None

    try:

        if photo is not None:

            extension = os.path.splitext(photo.filename or "")[1] or ".jpg"

            photo_path = os.path.join(
                tempfile.gettempdir(),
                f"reply_photo_{uuid.uuid4().hex}{extension}"
            )

            with open(photo_path, "wb") as destination:
                destination.write(photo.file.read())

        return ticket_service.send_manual_telegram_reply(
            db,
            ticket_id,
            current_user,
            text,
            photo_path
        )

    finally:

        if photo_path and os.path.exists(photo_path):
            os.remove(photo_path)


@router.delete(
    "/{ticket_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_staff)]
)
def delete_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket_service.delete_ticket(
        db,
        ticket_id,
        current_user
    )

    return Response(
        status_code=status.HTTP_204_NO_CONTENT
    )


@router.get(
    "/{ticket_id}/comments",
    response_model=list[TicketCommentResponse]
)
def get_comments(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return ticket_service.get_comments(
        db,
        ticket_id,
        current_user
    )


@router.post(
    "/{ticket_id}/comments",
    response_model=TicketCommentResponse,
    status_code=status.HTTP_201_CREATED
)
def add_comment(
    ticket_id: int,
    data: TicketCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return ticket_service.add_comment(
        db,
        ticket_id,
        data.text,
        current_user
    )