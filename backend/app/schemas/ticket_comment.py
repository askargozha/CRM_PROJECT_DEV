from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TicketCommentCreate(BaseModel):
    text: str


class CommentAuthorResponse(BaseModel):
    id: int
    full_name: str

    model_config = ConfigDict(
        from_attributes=True
    )


class TicketCommentResponse(BaseModel):
    id: int
    text: str
    created_at: datetime
    author: CommentAuthorResponse | None = None

    model_config = ConfigDict(
        from_attributes=True
    )
