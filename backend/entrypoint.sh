#!/bin/sh
# Этот скрипт запускается ПЕРЕД любой командой контейнера — сначала
# дожидается, пока база данных станет доступна.
#
# Миграции (alembic upgrade head) и создание админа выполняются
# ТОЛЬКО для веб-сервера (uvicorn), не для бота — если бы оба
# контейнера при одновременном старте пытались катить миграции
# параллельно, получалась бы гонка ("relation already exists").
# Бот вместо этого просто ждёт, пока backend не станет "healthy"
# (см. healthcheck и condition: service_healthy в docker-compose.yml)
# — то есть миграции к тому моменту уже гарантированно накачены.

set -e

# Копируем сертификаты certifi в системное хранилище для google-genai и других
# HTTP-библиотек, работающих с нестандартными SSL-сертификатами.
echo "Обновляю SSL-сертификаты..."
python -c "import certifi; open('/etc/ssl/certs/ca-bundle.crt', 'w').write(open(certifi.where()).read())" 2>/dev/null || true
cp /etc/ssl/certs/ca-bundle.crt /etc/ssl/certs/ca-certificates.crt 2>/dev/null || true
update-ca-certificates --fresh 2>/dev/null || true

echo "Ожидаю базу данных..."

while ! python -c "
import socket, os, sys
from urllib.parse import urlparse

# На Render (и похожих площадках) адрес базы приходит одной строкой
# DATABASE_URL, а не отдельными DB_HOST/DB_PORT — поддерживаем оба
# варианта, чтобы этот скрипт одинаково работал и локально (docker
# compose), и там.
database_url = os.environ.get('DATABASE_URL')

if database_url:
    parsed = urlparse(database_url)
    host = parsed.hostname
    port = parsed.port or 5432
else:
    host = os.environ['DB_HOST']
    port = int(os.environ['DB_PORT'])

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(1)
try:
    s.connect((host, port))
    s.close()
except Exception:
    sys.exit(1)
"; do
    echo "База данных ещё не готова, жду 1 секунду..."
    sleep 1
done

echo "База данных доступна."

case "$1" in
    uvicorn)
        echo "Применяю миграции (alembic upgrade head)..."
        alembic upgrade head

        echo "Создаю роли и первого администратора (если их ещё нет)..."
        python seed_admin.py

        # Render сам назначает порт через переменную PORT — контейнер
        # обязан слушать именно его. Локально (docker compose) эта
        # переменная не задана, тогда используем прежний порт 8000.
        PORT="${PORT:-8000}"
        echo "Готово, запускаю uvicorn на порту $PORT"
        # UVICORN_RELOAD=1 — только для локальной разработки
        # (docker-compose.dev.yml): перезапуск при правке кода.
        if [ -n "$UVICORN_RELOAD" ]; then
            exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT" --reload --reload-dir app
        fi
        exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
        ;;
    *)
        echo "Это не веб-сервер (скорее всего, бот) — миграции не трогаю."
        echo "Готово, запускаю: $@"
        exec "$@"
        ;;
esac
