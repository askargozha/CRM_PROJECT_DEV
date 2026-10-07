from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.user import User


class UserRepository:

    def get_all(
        self,
        db: Session
    ) -> list[User]:
        return (
            db.query(User)
            .options(joinedload(User.role))
            .order_by(User.id)
            .all()
        )

    def get_by_id(
        self,
        db: Session,
        user_id: int
    ) -> User | None:
        return (
            db.query(User)
            .options(joinedload(User.role))
            .filter(User.id == user_id)
            .first()
        )

    def get_by_username(
        self,
        db: Session,
        username: str
    ) -> User | None:
        return (
            db.query(User)
            .options(joinedload(User.role))
            .filter(func.lower(User.username) == username.lower())
            .first()
        )

    def get_by_email(
        self,
        db: Session,
        email: str
    ) -> User | None:
        return (
            db.query(User)
            .filter(User.email == email)
            .first()
        )

    def create(
        self,
        db: Session,
        user: User
    ) -> User:
        db.add(user)

        try:
            db.commit()
            db.refresh(user)
            return user
        except Exception:
            db.rollback()
            raise

    def update(
        self,
        db: Session,
        user: User
    ) -> User:
        try:
            db.commit()
            db.refresh(user)
            return user
        except Exception:
            db.rollback()
            raise

    def delete(
        self,
        db: Session,
        user: User
    ) -> None:
        db.delete(user)

        try:
            db.commit()
        except Exception:
            db.rollback()
            raise
