import re

from pydantic import BaseModel, EmailStr, Field, field_validator


class LoginRequest(BaseModel):
    username: str
    password: str


class SendCodeRequest(BaseModel):
    email: EmailStr


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    username: str = Field(min_length=3, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=255)
    code: str = Field(min_length=6, max_length=6)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:

        if not re.search(r"[A-ZА-ЯЁ]", value):
            raise ValueError(
                "Пароль должен содержать хотя бы одну заглавную букву"
            )

        if not re.search(r"[a-zа-яё]", value):
            raise ValueError(
                "Пароль должен содержать хотя бы одну строчную букву"
            )

        if not re.search(r"\d", value):
            raise ValueError(
                "Пароль должен содержать хотя бы одну цифру"
            )

        if not re.search(r"[^\w\s]", value):
            raise ValueError(
                "Пароль должен содержать хотя бы один специальный "
                "символ (например: ! @ # $ % & * . , ? -)"
            )

        return value


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CurrentUserResponse(BaseModel):
    id: int
    full_name: str
    username: str
    email: str
    role_id: int
    role_name: str
    is_active: bool