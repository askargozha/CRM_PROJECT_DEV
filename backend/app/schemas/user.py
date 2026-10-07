from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class RoleShort(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class UserBase(BaseModel):
    full_name: str
    username: str
    email: EmailStr
    role_id: int
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: str | None = None
    username: str | None = None
    email: EmailStr | None = None
    password: str | None = None
    role_id: int | None = None
    is_active: bool | None = None


class UserResponse(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime
    role: RoleShort | None = None

    model_config = ConfigDict(
        from_attributes=True
    )