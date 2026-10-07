from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.email_operator import EmailOperator
from app.repositories.email_operator_repository import EmailOperatorRepository
from app.schemas.email_operator import EmailOperatorCreate, EmailOperatorUpdate


def _normalize(name: str) -> str:
    return name.strip().casefold()


class EmailOperatorService:

    def __init__(self) -> None:
        self.repository = EmailOperatorRepository()

    def get_all(self, db: Session) -> list[EmailOperator]:
        return self.repository.get_all(db)

    def get_by_id(
        self,
        db: Session,
        operator_id: int
    ) -> EmailOperator:

        operator = self.repository.get_by_id(db, operator_id)

        if not operator:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Оператор связи не найден в списке рассылки"
            )

        return operator

    def _check_name_unique(
        self,
        db: Session,
        full_name: str,
        exclude_id: int | None = None
    ) -> None:

        for existing in self.repository.get_all(db):

            if exclude_id is not None and existing.id == exclude_id:
                continue

            if _normalize(existing.full_name) == _normalize(full_name):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "Этот оператор связи уже есть в списке — "
                        "измените существующую запись вместо создания новой"
                    )
                )

    def create(
        self,
        db: Session,
        data: EmailOperatorCreate
    ) -> EmailOperator:

        if self.repository.get_by_email(db, data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Такой email уже есть в списке"
            )

        self._check_name_unique(db, data.full_name)

        # Все адреса сразу при создании — раньше второй адрес при создании
        # терялся и сохранялся только при последующем редактировании.
        operator = EmailOperator(
            full_name=data.full_name,
            email=data.email,
            secondary_email=data.secondary_email,
            tertiary_email=data.tertiary_email,
            is_active=data.is_active
        )

        return self.repository.create(db, operator)

    def update(
        self,
        db: Session,
        operator_id: int,
        data: EmailOperatorUpdate
    ) -> EmailOperator:

        operator = self.get_by_id(db, operator_id)

        update_data = data.model_dump(exclude_unset=True)

        if "email" in update_data:

            existing = self.repository.get_by_email(
                db,
                update_data["email"]
            )

            if existing and existing.id != operator.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Такой email уже есть в списке"
                )

        if "full_name" in update_data:
            self._check_name_unique(
                db,
                update_data["full_name"],
                exclude_id=operator.id
            )

        for field, value in update_data.items():
            setattr(operator, field, value)

        return self.repository.update(db, operator)

    def delete(
        self,
        db: Session,
        operator_id: int
    ) -> None:

        operator = self.get_by_id(db, operator_id)
        self.repository.delete(db, operator)

    def get_for_operator_name(
        self,
        db: Session,
        operator_name: str
    ) -> EmailOperator | None:
        """
        Возвращает получателя писем для конкретного оператора связи
        (Kcell / Beeline / Tele2 / Казахтелеком / ...) — сравнение
        без учёта регистра и лишних пробелов, чтобы не зависеть от
        точного регистра при заполнении формы.

        Altel и Актив/Activ — это те же самые компании, что Tele2 и
        Kcell соответственно (просто другое название бренда) —
        подстраховка на случай, если где-то (старое обращение,
        ручной ввод сотрудником) всё ещё встретится именно старое
        название, а не основное.

        Письмо от неактивной записи не отправляется.
        """

        target = _normalize(operator_name)

        operator_aliases = {
            _normalize("Altel"): _normalize("Tele2"),
            _normalize("Актив"): _normalize("Kcell"),
            _normalize("Activ"): _normalize("Kcell"),
        }

        target = operator_aliases.get(target, target)

        for candidate in self.repository.get_active(db):
            if _normalize(candidate.full_name) == target:
                return candidate

        return None
