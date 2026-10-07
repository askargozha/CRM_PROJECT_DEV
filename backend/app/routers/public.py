"""
Маршруты, специально предназначенные для доступа БЕЗ входа в
систему — открытая ссылка для сторонних сайтов/партнёров (например,
встраивание общей аналитики на другом ресурсе). В отличие от
основного роутера tickets.py, здесь нет общей зависимости
get_current_user — эти данные намеренно открыты всем.

Отдаётся только то, что и так не содержит персональных данных
(та же самая урезанная схема TicketAnalyticsItem, что видит и
обычный житель в личном кабинете) — ничего дополнительного тут не
раскрывается.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.ticket import TicketAnalyticsItem
from app.services.ticket_service import TicketService

router = APIRouter(
    prefix="/public",
    tags=["Публичные данные (без входа)"]
)

ticket_service = TicketService()


@router.get(
    "/analytics-summary",
    response_model=list[TicketAnalyticsItem]
)
def get_public_analytics_summary(
    db: Session = Depends(get_db)
):
    """
    То же самое, что и /tickets/analytics-summary, только без
    требования входа в систему — для публичной страницы аналитики
    (используется сторонним сайтом через прямую ссылку/iframe).
    """
    return ticket_service.get_analytics_tickets(db)
