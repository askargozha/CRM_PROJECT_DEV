# Базовый образ с Python. "slim" — облегчённая версия, меньше весит.
FROM python:3.13-slim

# Рабочая папка внутри контейнера — весь код backend будет здесь.
WORKDIR /app

# Системные пакеты, нужные для psycopg2 (драйвер PostgreSQL) при сборке,
# и ca-certificates — без него Python внутри контейнера не может
# проверить сертификат ни одного внешнего HTTPS-сервиса (Gemini,
# Gmail, Telegram) и падает с "unable to get local issuer certificate".
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    ca-certificates \
    && update-ca-certificates --fresh \
    && rm -rf /var/lib/apt/lists/*

# Некоторые HTTP-библиотеки (в том числе та, которую использует
# клиент Gemini) проверяют HTTPS не через системные сертификаты
# выше, а через собственный пакет certifi, либо через явно указанные
# переменные окружения — задаём их тоже, на все случаи сразу.
ENV SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt
ENV REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt
ENV CURL_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt
ENV CERTIFI_PATH=/usr/local/lib/python3.13/site-packages/certifi/cacert.pem

# Сначала копируем только requirements.txt и ставим зависимости —
# так Docker закэширует этот слой и не будет переустанавливать всё
# заново при каждом изменении кода (только когда меняется сам
# requirements.txt).
COPY requirements.txt .

# --trusted-host — та же проблема с сетью (корпоративный файрвол режет
# TLS-цепочку), что и с обращением к Gemini/Telegram из уже запущенного
# контейнера, только на этот раз она мешает уже на этапе СБОРКИ образа,
# когда pip качает пакеты с PyPI — а обход из ai_service.py на этот
# момент ещё не действует (тот работает только внутри уже запущенного
# приложения, не во время docker build). Явно говорим pip доверять
# нужным адресам, не отключая проверку сертификатов вообще везде.
RUN pip install --no-cache-dir \
        --trusted-host pypi.org \
        --trusted-host pypi.python.org \
        --trusted-host files.pythonhosted.org \
        --upgrade pip certifi && \
    pip install --no-cache-dir \
        --trusted-host pypi.org \
        --trusted-host pypi.python.org \
        --trusted-host files.pythonhosted.org \
        -r requirements.txt && \
    python -m certifi > /tmp/certifi_path.txt && \
    cat /tmp/certifi_path.txt && \
    update-ca-certificates --fresh

# Теперь копируем весь остальной код backend.
COPY . .

# Скрипт, который перед стартом сам накатывает миграции базы данных
# (alembic upgrade head), чтобы не забывать делать это руками.
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]

# Команда по умолчанию — обычный веб-сервер. Для бота она
# переопределяется прямо в docker-compose.yml. Порт сюда не зашиваем —
# его подставляет entrypoint.sh (локально — 8000, на Render — то, что
# он сам назначит через переменную PORT).
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0"]
