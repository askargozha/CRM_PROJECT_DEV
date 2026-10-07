from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class EmailOperatorBase(BaseModel):
    full_name: str
    email: EmailStr
    secondary_email: EmailStr | None = None
    tertiary_email: EmailStr | None = None
    is_active: bool = True


class EmailOperatorCreate(EmailOperatorBase):
    pass


class EmailOperatorUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    secondary_email: EmailStr | None = None
    tertiary_email: EmailStr | None = None
    is_active: bool | None = None


class EmailOperatorResponse(EmailOperatorBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )
