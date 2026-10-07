from sqlalchemy.orm import Session, joinedload

from app.models.ticket_comment import TicketComment


class TicketCommentRepository:

    def get_for_ticket(
        self,
        db: Session,
        ticket_id: int
    ) -> list[TicketComment]:
        return (
            db.query(TicketComment)
            .options(joinedload(TicketComment.author))
            .filter(TicketComment.ticket_id == ticket_id)
            .order_by(TicketComment.created_at)
            .all()
        )

    def create(
        self,
        db: Session,
        comment: TicketComment
    ) -> TicketComment:
        db.add(comment)

        try:
            db.commit()
            db.refresh(comment)
            return comment
        except Exception:
            db.rollback()
            raise
