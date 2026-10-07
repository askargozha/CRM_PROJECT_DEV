from datetime import date

from sqlalchemy.orm import Session

from app.models.ticket import Ticket


class TicketRepository:

    def get_all(self, db: Session) -> list[Ticket]:
        return (
            db.query(Ticket)
            .order_by(Ticket.id)
            .all()
        )

    def get_all_by_creator(
        self,
        db: Session,
        user_id: int
    ) -> list[Ticket]:
        return (
            db.query(Ticket)
            .filter(Ticket.created_by_user_id == user_id)
            .order_by(Ticket.id)
            .all()
        )

    def count_by_creator_on_date(
        self,
        db: Session,
        user_id: int,
        target_date: date
    ) -> int:
        return (
            db.query(Ticket)
            .filter(
                Ticket.created_by_user_id == user_id,
                Ticket.created_date == target_date
            )
            .count()
        )

    def get_by_id(
        self,
        db: Session,
        ticket_id: int
    ) -> Ticket | None:
        return (
            db.query(Ticket)
            .filter(Ticket.id == ticket_id)
            .first()
        )

    def exists_by_external_reference(
        self,
        db: Session,
        external_reference: str
    ) -> bool:
        return (
            db.query(Ticket)
            .filter(Ticket.external_reference == external_reference)
            .first()
        ) is not None

    def create(
        self,
        db: Session,
        ticket: Ticket
    ) -> Ticket:
        db.add(ticket)
        db.commit()
        db.refresh(ticket)

        return ticket

    def update(
        self,
        db: Session,
        ticket: Ticket
    ) -> Ticket:
        db.commit()
        db.refresh(ticket)

        return ticket

    def delete(
        self,
        db: Session,
        ticket: Ticket
    ) -> None:
        db.delete(ticket)
        db.commit()