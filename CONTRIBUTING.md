# Как работать с проектом (для практикантов)

Smart Aqmola CRM — приём и обработка обращений жителей Акмолинской
области по связи и интернету. Backend — FastAPI (Python), frontend —
React + Vite, база — PostgreSQL. Локально всё запускается в Docker одной
командой.

## Правила (важно)

1. **Работаем только локально.** Боевой сервер, боевую базу и боевые
   ключи вы не получаете и не ищете — это не недоверие, а закон о
   персональных данных: там реальные ФИО и телефоны жителей.
2. **Никаких паролей и ключей в git.** Файлы `.env*` в репозиторий не
   добавляются (они в `.gitignore`). Свой ключ Gemini — только в своём
   `backend/.env.dev`.
3. **В `main` напрямую не пушим.** Каждая задача — своя ветка и Pull
   Request в `dev` (см. ниже). Руководитель смотрит и принимает.
4. **Один Pull Request — одна задача.** Не смешивайте в одном PR новую
   страницу, правку бага и «заодно переформатировал все файлы».

## 1. Что установить (один раз)

- [Git](https://git-scm.com/downloads) — при установке всё по умолчанию.
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) —
  после установки перезагрузить компьютер и запустить Docker Desktop.
- [VS Code](https://code.visualstudio.com/). При первом открытии проекта
  VS Code предложит рекомендованные расширения — нажмите «Установить».
- Аккаунт на [GitHub](https://github.com) — отправьте свой логин
  руководителю, он добавит вас в репозиторий.

Представьтесь git'у — так в истории будет видно, кто что сделал
(имя — настоящее, почта — та же, что на GitHub):

```bash
git config --global user.name "Имя Фамилия"
git config --global user.email "ваша@почта"
```

## 2. Скачать и запустить

В VS Code: Terminal → New Terminal.

```powershell
cd ~\Documents
git clone https://github.com/askargozha/CRM_PROJECT_DEV.git
cd CRM_PROJECT_DEV
git checkout dev
code .
```

При первом `clone` откроется браузер — войдите в свой GitHub
(приглашение в репозиторий должно быть уже принято — письмо от GitHub
«invited you to CRM_PROJECT_DEV» → **Accept invitation**).

Создать файл настроек:

```bash
# Windows (PowerShell)
copy backend\.env.dev.example backend\.env.dev
# Mac / Linux
cp backend/.env.dev.example backend/.env.dev
```

Без ключей сайт работает полностью, кроме трёх интеграций. Если ваша
задача про одну из них — включите её **своим тестовым** ключом в
`backend/.env.dev` (подробности — комментарии в самом файле):

| Что | Что вписать |
| --- | --- |
| ИИ-анализ обращений | `GEMINI_API_KEY` — бесплатно на https://aistudio.google.com/apikey |
| Отправка и приём писем | `GMAIL_ADDRESS`, `GMAIL_APP_PASSWORD` — тестовый Gmail и его пароль приложения |
| Telegram-бот | `TELEGRAM_BOT_TOKEN` своего бота от @BotFather и `RUN_BOT_IN_BACKEND=true` |

После правки `.env.dev` — `docker compose -f docker-compose.dev.yml up -d backend`
(перезапуск backend с новыми настройками).

Синхронизация с внешней CRM ЕКЦ 109 локально всегда выключена.

Запуск (первый раз — 3–10 минут):

```bash
docker compose -f docker-compose.dev.yml up --build
```

Когда в логах появится `Uvicorn running` и `VITE ... ready`, откройте
второй терминал и залейте тестовые данные (один раз):

```bash
docker compose -f docker-compose.dev.yml exec backend python seed_demo.py
```

| Что | Адрес |
| --- | --- |
| Сайт | http://localhost:5173 |
| API и его документация | http://localhost:8000/docs |
| База (pgAdmin / DBeaver) | localhost:5433, база `crm_db`, `postgres` / `devpassword` |

Тестовые входы:

| Роль | Логин | Пароль |
| --- | --- | --- |
| Администратор | `admin` | `admin123` |
| Специалист | `specialist` | `specialist123` |
| Пользователь | `user` | `user123` |

Код подключён «вживую»: сохранили файл — backend или сайт перезапустился
сам. Пересобирать (`--build`) нужно, только если менялись
`requirements.txt`, `package.json` или `Dockerfile`.

Остановить — `Ctrl+C` в терминале с логами или
`docker compose -f docker-compose.dev.yml down`.
Начать с чистой базы — `docker compose -f docker-compose.dev.yml down -v`
(удаляет только вашу локальную тестовую базу).

## 3. Как сдавать работу

```bash
git checkout dev
git pull                                  # свежая версия
git checkout -b feature/ivan-export-csv   # ветка: feature/<имя>-<что-делаю>
```

Работаете, сохраняете промежуточные шаги:

```bash
git add .
git commit -m "Экспорт обращений в CSV на странице Аналитика"
```

Сообщение коммита — по-русски, что сделано («Добавил…», «Исправил…»),
а не «правки» и «фикс».

Отправить на GitHub:

```bash
git push -u origin feature/ivan-export-csv
```

На GitHub появится кнопка **Compare & pull request** →
**base: `dev`** ← ваша ветка → заполнить шаблон описания → **Create pull
request**. Руководитель оставит замечания прямо в коде; исправляете в
той же ветке, `git push` — PR обновится сам.

Пока ждёте ревью, следующую задачу начинайте с новой ветки от `dev`.

## 4. Где что лежит

```
backend/
  app/main.py            — запуск API, фоновые задачи
  app/routers/           — адреса API (что вызывает сайт)
  app/services/          — логика: обращения, ИИ, почта, отчёты
  app/repositories/      — запросы к базе
  app/models/            — таблицы базы
  app/schemas/           — форматы данных API
  alembic/versions/      — миграции базы
  seed_admin.py          — роли и admin (запускается сам)
  seed_demo.py           — тестовые данные
frontend/src/
  pages/                 — страницы сайта
  components/            — общие компоненты
  api/                   — запросы к backend
  i18n/translations.js   — тексты на русском и казахском
```

**Меняете таблицы базы?** Нужна миграция:

```bash
docker compose -f docker-compose.dev.yml exec backend alembic revision --autogenerate -m "что изменилось"
```

Проверьте сгенерированный файл в `backend/alembic/versions/` и
закоммитьте его вместе с изменением модели.

**Добавляете текст на сайт?** Оба языка — в `frontend/src/i18n/translations.js`.

## Если что-то не работает

- `port is already allocated` — порт занят (часто вторым запуском
  проекта или своим Postgres). Остановите лишнее или спросите руководителя.
- Сайт открылся, но данных нет / «Network Error» — backend ещё
  запускается, подождите строку `Uvicorn running` в логах.
- Правки не подхватываются — проверьте, что сохранили файл; в крайнем
  случае `docker compose -f docker-compose.dev.yml restart backend`.
