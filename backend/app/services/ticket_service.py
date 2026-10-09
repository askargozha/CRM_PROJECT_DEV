import logging
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.roles import CITIZEN_ROLE_NAME, SPECIALIST_ROLE_NAME
from app.models.ticket import Ticket
from app.models.ticket_comment import TicketComment
from app.models.user import User
from app.repositories.ticket_comment_repository import TicketCommentRepository
from app.repositories.ticket_repository import TicketRepository
from app.repositories.user_repository import UserRepository
from app.schemas.ticket import TicketCreate, TicketUpdate
from app.services.ai_service import AIAnalysisError, analyze_ticket
from app.services.email_service import EmailSendError, send_ticket_notification
from app.services.telegram_notify import send_telegram_message, send_telegram_photo

logger = logging.getLogger(__name__)

# Защита от злоупотребления: если с одного аккаунта (веб-аккаунт
# жителя либо общий служебный аккаунт Telegram-бота) в сутки создаётся
# больше этого числа сообщений — дальнейшие письма операторам в этот
# день автоматически не уходят (иначе можно случайно попасть под
# анти-спам блокировку Gmail-ящика). Сообщения при этом всё равно
# создаются — просто письмо не отправляется само, пока сотрудник не
# проверит и не отправит вручную.
MAX_AUTO_SEND_TICKETS_PER_DAY = 20


def _is_citizen(user: User) -> bool:
    return user.role.name == CITIZEN_ROLE_NAME


class TicketService:

    def __init__(self) -> None:
        self.repository = TicketRepository()
        self.user_repository = UserRepository()
        self.comment_repository = TicketCommentRepository()

    def get_all_tickets(
        self,
        db: Session,
        current_user: User
    ) -> list[Ticket]:

        # Обычный пользователь (бывшая роль "Наблюдатель") видит
        # только обращения, которые сам создал. Сотрудники видят всё.
        if _is_citizen(current_user):
            return self.repository.get_all_by_creator(
                db,
                current_user.id
            )

        return self.repository.get_all(db)
    def get_unsent_tickets(
        self,
        db: Session,
        current_user: User
    ) -> list[Ticket]:
        """
        Возвращает неотправленные обращения (email_sent = False) для сотрудников.
        """
        self._require_staff(current_user)
        
        all_tickets = self.repository.get_all(db)
        return [
            t for t in all_tickets 
            if not t.email_sent and t.status != "Закрыто"
        ]    

    def get_analytics_tickets(
        self,
        db: Session
    ) -> list[Ticket]:
        """
        Для общей аналитики видимость не ограничивается ролью —
        только сами данные урезаны на уровне схемы ответа
        (TicketAnalyticsItem), без персональных данных заявителей.
        """
        return self.repository.get_all(db)

    def get_ticket_by_id(
        self,
        db: Session,
        ticket_id: int,
        current_user: User
    ) -> Ticket:

        ticket = self.repository.get_by_id(
            db,
            ticket_id
        )

        if ticket is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Обращение не найдено"
            )

        # Чужое обращение для обычного пользователя выглядит так же,
        # как несуществующее — чтобы не подтверждать сам факт его
        # существования.
        if (
            _is_citizen(current_user)
            and ticket.created_by_user_id != current_user.id
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Обращение не найдено"
            )

        return ticket

    def create_ticket(
        self,
        db: Session,
        ticket_data: TicketCreate,
        current_user: User,
        send_notification: bool = True
    ) -> Ticket:

        ticket_fields = ticket_data.model_dump()
        ticket_fields["created_by_user_id"] = current_user.id

        # Житель не должен иметь возможность сам себе выставить
        # статус, назначить специалиста или зафиксировать приоритет
        # через тело запроса — приоритет определяет ИИ сразу после
        # создания, остальное остаётся зоной ответственности
        # сотрудников.
        is_citizen_ticket = _is_citizen(current_user)

        if is_citizen_ticket:
            ticket_fields["status"] = "Новое"
            ticket_fields["assigned_user_id"] = None
            ticket_fields["priority"] = "Средний"

        new_ticket = Ticket(
            **ticket_fields
        )

        ticket = self.repository.create(
            db,
            new_ticket
        )

        # ИИ-анализ выполняется сразу после создания.
        # Если локальная модель недоступна/ошиблась — сообщение
        # всё равно остаётся созданным, просто без ИИ-разметки.
        self._run_ai_analysis(
            db,
            ticket,
            force_priority=is_citizen_ticket
        )

        # Письмо оператору отправляется уже с готовым ИИ-разбором.
        # Сбой отправки (неверный пароль приложения, нет сети и т.д.)
        # не должен мешать созданию сообщения.
        #
        # send_notification=False используется, когда к обращению ещё
        # предстоит прикрепить что-то (например, фото из Telegram-бота)
        # — вызывающий код сам должен позвать send_notification_email_now
        # уже после того, как всё прикреплено. Проверка лимита/модерации
        # при этом выполняется всегда, независимо от send_notification.
        skip_reason = self._get_autosend_block_reason(db, ticket)

        if skip_reason:
            ticket.email_sent = False
            ticket.email_error = skip_reason
            self.repository.update(db, ticket)
        elif send_notification:
            self._send_notification_email(db, ticket)

        return ticket

    def send_notification_email_now(
        self,
        db: Session,
        ticket: Ticket
    ) -> None:
        """
        Публичная обёртка для отправки уведомления сразу, в обход
        проверки лимита/модерации (та уже была выполнена в момент
        создания обращения) — нужна вызывающему коду, который создавал
        обращение с send_notification=False и теперь готов отправить
        письмо (например, после того как прикрепил фото).
        """
        self._send_notification_email(db, ticket)

    def _get_autosend_block_reason(
        self,
        db: Session,
        ticket: Ticket
    ) -> str | None:
        """
        Возвращает причину, по которой автоматическую отправку письма
        нужно пропустить (сообщение при этом всё равно создаётся —
        просто письмо остаётся неотправленным, и его нужно проверить
        и отправить вручную со страницы сообщения). Возвращает None,
        если отправлять можно как обычно.
        """

        if ticket.created_by_user_id:

            today_count = self.repository.count_by_creator_on_date(
                db,
                ticket.created_by_user_id,
                date.today()
            )

            if today_count > MAX_AUTO_SEND_TICKETS_PER_DAY:
                return (
                    f"Не отправлено автоматически: с этого аккаунта уже "
                    f"создано больше {MAX_AUTO_SEND_TICKETS_PER_DAY} "
                    "обращений за сегодня — проверьте вручную перед "
                    "отправкой оператору."
                )

        if not ticket.ai_processed:
            # ИИ не смог проверить текст (сбой сети, недоступен Gemini
            # и т.п.) — раз мы не можем подтвердить, что сообщение
            # безопасно (не мат, не пустой текст), лучше перестраховаться
            # и не отправлять автоматически, а не наоборот.
            return (
                "Не отправлено автоматически: ИИ-анализ не выполнился "
                "(сбой сети/сервиса) — содержимое не проверено, "
                "проверьте текст вручную перед отправкой."
            )

        if ticket.ai_contains_profanity:
            return (
                "Не отправлено автоматически: ИИ обнаружил в тексте "
                "нецензурную лексику — "
                f"{ticket.ai_moderation_reason or 'проверьте текст'}."
            )

        if ticket.ai_is_meaningful is False:
            return (
                "Не отправлено автоматически: ИИ посчитал текст "
                "несодержательным — "
                f"{ticket.ai_moderation_reason or 'проверьте текст'}."
            )

        return None

    def resend_notification_email(
        self,
        db: Session,
        ticket_id: int,
        current_user: User,
        operator_id: int | None = None,
        manual_email: str | None = None
    ) -> Ticket:

        self._require_staff(current_user)

        ticket = self.get_ticket_by_id(db, ticket_id, current_user)
        self._send_notification_email(db, ticket, operator_id, manual_email)

        return ticket

    def send_manual_telegram_reply(
        self,
        db: Session,
        ticket_id: int,
        current_user: User,
        text: str | None,
        photo_path: str | None = None
    ) -> Ticket:
        """
        Ручной ответ сотрудника жителю прямо в тот же Telegram-чат,
        откуда пришло обращение (текст и/или фото). Работает только
        для обращений, созданных через бота — у остальных просто нет
        chat_id, отправлять некуда.
        """

        self._require_staff(current_user)

        ticket = self.get_ticket_by_id(db, ticket_id, current_user)

        if not ticket.telegram_chat_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Это обращение создано не через Telegram-бота — "
                    "отправить ответ в чат некому."
                )
            )

        if not text and not photo_path:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Введите текст или приложите фото."
            )

        if photo_path:
            error_text = send_telegram_photo(
                ticket.telegram_chat_id,
                photo_path,
                caption=text or None
            )
        else:
            error_text = send_telegram_message(
                ticket.telegram_chat_id,
                text
            )

        if error_text:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Не удалось отправить сообщение в Telegram: {error_text}"
            )

        return ticket

    def _send_notification_email(
        self,
        db: Session,
        ticket: Ticket,
        operator_id: int | None = None,
        manual_email: str | None = None
    ) -> None:

        try:
            recipient_str, operator = send_ticket_notification(
                db, ticket, operator_id, manual_email
            )

            ticket.email_sent = True
            ticket.email_recipient = recipient_str
            ticket.email_operator_id = operator.id if operator else None
            ticket.email_error = None

            # Если обращение пришло из Telegram-бота — сообщаем жителю,
            # что его обращение реально ушло оператору связи. Сбой
            # этого уведомления (например, житель заблокировал бота)
            # не должен мешать сохранению статуса самой отправки письма.
            # Кому именно ушло письмо — жителю знать не обязательно,
            # достаточно самого факта отправки.
            if ticket.telegram_chat_id:

                send_telegram_message(
                    ticket.telegram_chat_id,
                    f"✅ Ваше обращение №{ticket.id} отправлено "
                    "оператору связи."
                )

        except EmailSendError as error:
            ticket.email_sent = False
            ticket.email_error = str(error)

        self.repository.update(db, ticket)

    def reanalyze_ticket(
        self,
        db: Session,
        ticket_id: int,
        current_user: User
    ) -> Ticket:

        self._require_staff(current_user)

        ticket = self.get_ticket_by_id(db, ticket_id, current_user)
        self._reanalyze_and_maybe_send_email(db, ticket)

        return ticket

    def _reanalyze_and_maybe_send_email(
        self,
        db: Session,
        ticket: Ticket
    ) -> None:
        """
        Общая часть: заново прогнать ИИ-анализ и, если письмо раньше
        не ушло именно из-за сбоя ИИ (не из-за мата/лимита) — а на
        этот раз анализ прошёл успешно, отправить письмо оператору
        сразу следом. Используется кнопкой "Переанализировать".
        """

        was_blocked_by_ai_failure = bool(
            not ticket.email_sent
            and ticket.email_error
            and "ИИ-анализ не выполнился" in ticket.email_error
        )

        self._run_ai_analysis(db, ticket)

        if (
            was_blocked_by_ai_failure
            and ticket.ai_processed
            and not ticket.email_sent
        ):

            skip_reason = self._get_autosend_block_reason(db, ticket)

            if skip_reason:
                # ИИ теперь отработал, но по итогам самого анализа
                # нашлась другая причина не отправлять (например, мат
                # или пустой текст) — эту причину и оставляем, письмо
                # по-прежнему не уходит автоматически.
                ticket.email_error = skip_reason
                self.repository.update(db, ticket)
            else:
                self._send_notification_email(db, ticket)

    @staticmethod
    def _require_staff(current_user: User) -> None:
        if _is_citizen(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Недостаточно прав для этого действия"
            )

    def _get_active_specialists(self, db: Session) -> list[dict]:
        return [
            {"id": user.id, "full_name": user.full_name}
            for user in self.user_repository.get_all(db)
            if user.is_active and user.role.name == SPECIALIST_ROLE_NAME
        ]

    def _run_ai_analysis(
        self,
        db: Session,
        ticket: Ticket,
        force_priority: bool = False
    ) -> None:

        specialists = self._get_active_specialists(db)

        try:
            result = analyze_ticket(ticket.description, specialists)

        except AIAnalysisError as error:
            ticket.ai_processed = False
            ticket.ai_summary = f"ИИ-анализ не выполнен: {error}"
            self.repository.update(db, ticket)
            return

        valid_specialist_ids = {s["id"] for s in specialists}
        suggested_user_id = result.get("assigned_user_id")

        ticket.ai_category = result.get("category")
        ticket.ai_operator = result.get("operator")
        ticket.ai_priority = result.get("priority")
        ticket.ai_summary = result.get("summary")
        ticket.ai_confidence = result.get("confidence")
        ticket.ai_draft_letter = result.get("draft_letter")
        ticket.ai_is_meaningful = result.get("is_meaningful", True)
        ticket.ai_contains_profanity = result.get("contains_profanity", False)
        ticket.ai_moderation_reason = result.get("moderation_reason")
        ticket.ai_processed = True

        # Если оператора никто не указал вручную при создании — берём
        # то, что определил ИИ, чтобы колонка "Оператор" и фильтр по
        # оператору в таблице не были пустыми.
        if not ticket.operator and ticket.ai_operator:
            ticket.operator = ticket.ai_operator

        # Аналогично для категории.
        if not ticket.category and ticket.ai_category:
            ticket.category = ticket.ai_category

        # Приоритет для обращений от жителей всегда берётся из ИИ —
        # житель не выбирает его сам (force_priority=True при
        # создании). При обычном повторном анализе (кнопка у
        # сотрудника) приоритет, выставленный сотрудником вручную,
        # не перезаписывается.
        if ticket.ai_priority and (force_priority or not ticket.priority):
            ticket.priority = ticket.ai_priority

        # Специалиста, назначенного человеком вручную, ИИ не перезаписывает.
        if (
            not ticket.assigned_user_id
            and suggested_user_id in valid_specialist_ids
        ):
            ticket.assigned_user_id = suggested_user_id

        self.repository.update(db, ticket)

    def update_ticket(
        self,
        db: Session,
        ticket_id: int,
        ticket_data: TicketUpdate,
        current_user: User
    ) -> Ticket:

        self._require_staff(current_user)

        ticket = self.get_ticket_by_id(
            db,
            ticket_id,
            current_user
        )

        update_data = ticket_data.model_dump(
            exclude_unset=True
        )

        # Назначать/менять исполнителя может только администратор —
        # специалист может видеть и менять остальные поля (статус,
        # приоритет и т.п.) как обычно, но не переназначать
        # исполнителя. Проверяем именно тут, а не только в интерфейсе
        # — иначе специалист мог бы обойти ограничение прямым запросом
        # к API, минуя кнопку в интерфейсе.
        if (
            "assigned_user_id" in update_data
            and current_user.role.name == SPECIALIST_ROLE_NAME
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Назначать исполнителя может только администратор"
            )

        for field, value in update_data.items():
            setattr(ticket, field, value)

        return self.repository.update(
            db,
            ticket
        )

    def delete_ticket(
        self,
        db: Session,
        ticket_id: int,
        current_user: User
    ) -> None:

        self._require_staff(current_user)

        ticket = self.get_ticket_by_id(
            db,
            ticket_id,
            current_user
        )

        self.repository.delete(
            db,
            ticket
        )

    def get_comments(
        self,
        db: Session,
        ticket_id: int,
        current_user: User
    ) -> list[TicketComment]:

        # get_ticket_by_id уже проверяет права (гражданин не видит
        # чужое сообщение — а значит, и его комментарии тоже).
        self.get_ticket_by_id(db, ticket_id, current_user)

        return self.comment_repository.get_for_ticket(db, ticket_id)

    def add_comment(
        self,
        db: Session,
        ticket_id: int,
        text: str,
        current_user: User
    ) -> TicketComment:

        self.get_ticket_by_id(db, ticket_id, current_user)

        cleaned_text = text.strip()

        if not cleaned_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Комментарий не может быть пустым"
            )

        comment = TicketComment(
            ticket_id=ticket_id,
            author_user_id=current_user.id,
            text=cleaned_text
        )

        return self.comment_repository.create(db, comment)
