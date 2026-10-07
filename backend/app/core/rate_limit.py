"""
Простой in-memory лимитер попыток входа по IP-адресу — защита от
перебора логинов с одного адреса (в дополнение к блокировке
конкретного аккаунта после нескольких неверных попыток).

Хранится в памяти процесса: при перезапуске backend счётчики
сбрасываются. Для одного процесса (как сейчас развёрнут проект) этого
достаточно; если понадобится несколько worker-процессов/серверов —
стоит вынести в Redis, но для текущего масштаба это лишнее.
"""
import time
from collections import defaultdict

IP_MAX_ATTEMPTS = 20
IP_WINDOW_SECONDS = 15 * 60

_attempts: dict[str, list[float]] = defaultdict(list)


def register_login_attempt(ip: str) -> None:

    now = time.time()

    _attempts[ip] = [
        timestamp
        for timestamp in _attempts[ip]
        if now - timestamp < IP_WINDOW_SECONDS
    ]

    _attempts[ip].append(now)


def is_ip_rate_limited(ip: str) -> bool:

    now = time.time()

    _attempts[ip] = [
        timestamp
        for timestamp in _attempts[ip]
        if now - timestamp < IP_WINDOW_SECONDS
    ]

    return len(_attempts[ip]) >= IP_MAX_ATTEMPTS


# Отдельный, независимый счётчик — для публичных маршрутов создания
# обращения без входа в систему (например, мини-приложение Aitu).
# Не путать с лимитом выше (тот — конкретно про попытки логина).
PUBLIC_TICKET_MAX_ATTEMPTS = 10
PUBLIC_TICKET_WINDOW_SECONDS = 60 * 60

_public_ticket_attempts: dict[str, list[float]] = defaultdict(list)


def register_public_ticket_attempt(ip: str) -> None:

    now = time.time()

    _public_ticket_attempts[ip] = [
        timestamp
        for timestamp in _public_ticket_attempts[ip]
        if now - timestamp < PUBLIC_TICKET_WINDOW_SECONDS
    ]

    _public_ticket_attempts[ip].append(now)


def is_public_ticket_rate_limited(ip: str) -> bool:

    now = time.time()

    _public_ticket_attempts[ip] = [
        timestamp
        for timestamp in _public_ticket_attempts[ip]
        if now - timestamp < PUBLIC_TICKET_WINDOW_SECONDS
    ]

    return len(_public_ticket_attempts[ip]) >= PUBLIC_TICKET_MAX_ATTEMPTS
