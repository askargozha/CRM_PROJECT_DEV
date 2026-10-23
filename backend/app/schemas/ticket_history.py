from datetime import datetime
from pydantic import BaseModel, ConfigDict


class TicketHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticket_id: int | None
    ticket_reference: int
    actor_user_id: int | None
    actor_name: str = "Система"
    event_type: str
    description: str
    before_value: str | None
    after_value: str | None
    details: dict | None
    created_at: datetime
