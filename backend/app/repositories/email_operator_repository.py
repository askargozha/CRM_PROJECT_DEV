from sqlalchemy.orm import Session

from app.models.email_operator import EmailOperator


class EmailOperatorRepository:

    def get_all(self, db: Session) -> list[EmailOperator]:
        return (
            db.query(EmailOperator)
            .order_by(EmailOperator.id)
            .all()
        )

    def get_active(self, db: Session) -> list[EmailOperator]:
        return (
            db.query(EmailOperator)
            .filter(EmailOperator.is_active.is_(True))
            .order_by(EmailOperator.id)
            .all()
        )

    def get_by_id(
        self,
        db: Session,
        operator_id: int
    ) -> EmailOperator | None:
        return (
            db.query(EmailOperator)
            .filter(EmailOperator.id == operator_id)
            .first()
        )

    def get_by_email(
        self,
        db: Session,
        email: str
    ) -> EmailOperator | None:
        return (
            db.query(EmailOperator)
            .filter(EmailOperator.email == email)
            .first()
        )

    def create(
        self,
        db: Session,
        operator: EmailOperator
    ) -> EmailOperator:
        db.add(operator)

        try:
            db.commit()
            db.refresh(operator)
            return operator
        except Exception:
            db.rollback()
            raise

    def update(
        self,
        db: Session,
        operator: EmailOperator
    ) -> EmailOperator:
        try:
            db.commit()
            db.refresh(operator)
            return operator
        except Exception:
            db.rollback()
            raise

    def delete(
        self,
        db: Session,
        operator: EmailOperator
    ) -> None:
        db.delete(operator)

        try:
            db.commit()
        except Exception:
            db.rollback()
            raise
