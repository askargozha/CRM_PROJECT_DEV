from datetime import datetime

from pydantic import BaseModel, ConfigDict


class IncomingEmailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    message_id: str
    from_address: str
    subject: str
    body: str
    received_at: datetime
    is_read: bool
    ticket_id: int | None = None


class FetchEmailsResponse(BaseModel):
    fetched: int
    matched: int
