import os
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from dotenv import load_dotenv
from jwt import InvalidTokenError
from pwdlib import PasswordHash

load_dotenv()

password_hash = PasswordHash.recommended()

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "480")
)

if not JWT_SECRET_KEY:
    raise RuntimeError(
        "В backend/.env отсутствует JWT_SECRET_KEY"
    )


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str
) -> bool:
    try:
        return password_hash.verify(
            plain_password,
            hashed_password
        )
    except Exception:
        return False


def create_access_token(
    subject: str,
    additional_claims: dict[str, Any] | None = None
) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload: dict[str, Any] = {
        "sub": subject,
        "exp": expires_at
    }

    if additional_claims:
        payload.update(additional_claims)

    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM
    )


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM]
        )
    except InvalidTokenError as error:
        raise ValueError(
            "Недействительный или просроченный токен"
        ) from error