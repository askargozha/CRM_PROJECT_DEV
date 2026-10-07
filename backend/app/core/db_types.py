"""
SQLAlchemy-тип, который прозрачно шифрует значение перед записью в
базу и расшифровывает при чтении — весь остальной код (репозитории,
сервисы, роутеры) продолжает работать с обычными строками, ничего
менять не нужно, кроме объявления поля в модели.

Важно: используется Text, а не String(N) — зашифрованное значение
(Fernet-токен, base64) заметно длиннее исходного текста даже для
короткой строки вроде номера телефона (сотня символов и больше) —
если оставить прежний короткий размер поля, запись не влезет и
упадёт с ошибкой при первой же попытке сохранить телефон.
"""
from sqlalchemy import Text
from sqlalchemy.types import TypeDecorator

from app.core.encryption import decrypt_value, encrypt_value


class EncryptedString(TypeDecorator):

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        return encrypt_value(value)

    def process_result_value(self, value, dialect):
        return decrypt_value(value)
