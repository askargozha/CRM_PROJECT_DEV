from sqlalchemy.orm import Session

from app.models.incoming_email import IncomingEmail


class IncomingEmailRepository:

    def get_all(self, db: Session) -> list[IncomingEmail]:
        return (
            db.query(IncomingEmail)
            .order_by(IncomingEmail.received_at.desc())
            .all()
        )

    def get_by_id(
        self,
        db: Session,
        email_id: int
    ) -> IncomingEmail | None:
        return (
            db.query(IncomingEmail)
            .filter(IncomingEmail.id == email_id)
            .first()
        )

    def get_by_message_id(
        self,
        db: Session,
        message_id: str
    ) -> IncomingEmail | None:
        return (
            db.query(IncomingEmail)
            .filter(IncomingEmail.message_id == message_id)
            .first()
        )

    def create(
        self,
        db: Session,
        email: IncomingEmail
    ) -> IncomingEmail:
        db.add(email)
        db.commit()
        db.refresh(email)
        return email

    def update(
        self,
        db: Session,
        email: IncomingEmail
    ) -> IncomingEmail:
        db.commit()
        db.refresh(email)
        return email
