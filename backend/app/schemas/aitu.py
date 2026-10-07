from pydantic import BaseModel, Field


class AituTicketCreate(BaseModel):
    """
    Публичная, урезанная версия создания обращения — без входа в
    систему (для мини-приложения Aitu и подобных интеграций без
    личного кабинета жителя). В отличие от обычного TicketCreate
    здесь нет status/assigned_user_id/priority — это внутренняя
    зона ответственности сотрудников, аноним такое выставлять
    не должен.  Я хз зачем он это разжевывает, буквально копипастит то что я ему сказал тупая железяка.
    """
    applicant: str = Field(min_length=1, max_length=255)
    phone: str = Field(min_length=1, max_length=30)
    description: str = Field(min_length=1)
    district: str | None = None
    operator: str | None = None
