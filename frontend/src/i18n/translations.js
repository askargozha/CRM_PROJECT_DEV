// Словарь переводов RU / KZ.
// Ключ — короткий смысловой слаг, значение — { ru, kz }.
// Используется через useLanguage().t('ключ') во всех компонентах.

export const translations = {
    // --- App shell: header, nav, footer ---
    app_header_title: {
        ru: "Smart Aqmola — обращения по связи",
        kz: "Smart Aqmola — байланыс бойынша өтініштер"
    },
    nav_logout: { ru: "Выйти", kz: "Шығу" },
    brand_tag: { ru: "CRM обращений", kz: "Хабарламалар CRM" },
    nav_home: { ru: "Главная", kz: "Басты бет" },
    nav_my_tickets: { ru: "Мои обращения", kz: "Менің өтініштерім" },
    nav_tickets: { ru: "Обращения", kz: "Хабарламалар" },
    nav_users: { ru: "Пользователи", kz: "Пайдаланушылар" },
    nav_staff: { ru: "Сотрудники", kz: "Қызметкерлер" },
    nav_email_operators: { ru: "Операторы рассылки", kz: "Таратылым операторлары" },
    nav_incoming_emails: { ru: "Входящие письма", kz: "Кіріс хаттар" },
    nav_analytics: { ru: "Аналитика", kz: "Аналитика" },
    nav_national_projects: { ru: "Нацпроекты", kz: "Ұлттық жобалар" },
    footer_copyright: {
        ru: "Smart Aqmola — CRM для обработки обращений",
        kz: "Smart Aqmola — өтініштерді өңдеуге арналған CRM"
    },
    footer_cybersecurity: {
        ru: "Информационная безопасность",
        kz: "Ақпараттық қауіпсіздік"
    },
    footer_digital_code: { ru: "Цифровой кодекс", kz: "Цифрлық кодекс" },

    // --- Login ---
    login_error_default: { ru: "Неверный логин или пароль", kz: "Логин немесе құпия сөз қате" },
    login_title: { ru: "CRM по обращениям связи", kz: "Байланыс өтініштері бойынша CRM" },
    login_subtitle: { ru: "Вход для сотрудников и жителей", kz: "Қызметкерлер мен тұрғындарға кіру" },
    login_username_label: { ru: "Логин", kz: "Логин" },
    login_username_placeholder: { ru: "Введите логин", kz: "Логинді енгізіңіз" },
    login_password_label: { ru: "Пароль", kz: "Құпия сөз" },
    login_password_placeholder: { ru: "Введите пароль", kz: "Құпия сөзді енгізіңіз" },
    login_submitting: { ru: "Выполняется вход...", kz: "Кіру орындалуда..." },
    login_submit: { ru: "Войти", kz: "Кіру" },
    login_no_account: { ru: "Ещё нет аккаунта?", kz: "Аккаунтыңыз жоқ па?" },
    login_register_link: { ru: "Зарегистрироваться", kz: "Тіркелу" },

    // --- Register ---
    register_error_password_mismatch: { ru: "Пароли не совпадают", kz: "Құпия сөздер сәйкес келмейді" },
    register_error_password_short: { ru: "Пароль должен содержать не менее 8 символов", kz: "Құпия сөз кемінде 8 таңбадан тұруы керек" },
    register_error_password_no_upper: { ru: "Пароль должен содержать хотя бы одну заглавную букву", kz: "Құпия сөзде кемінде бір бас әріп болуы керек" },
    register_error_password_no_lower: { ru: "Пароль должен содержать хотя бы одну строчную букву", kz: "Құпия сөзде кемінде бір кіші әріп болуы керек" },
    register_error_password_no_digit: { ru: "Пароль должен содержать хотя бы одну цифру", kz: "Құпия сөзде кемінде бір сан болуы керек" },
    register_error_password_no_symbol: { ru: "Пароль должен содержать хотя бы один спецсимвол (например: ! @ # $ % &)", kz: "Құпия сөзде кемінде бір арнайы таңба болуы керек (мысалы: ! @ # $ % &)" },
    register_password_hint: {
        ru: "Не менее 8 символов, заглавная и строчная буквы, цифра и спецсимвол",
        kz: "Кемінде 8 таңба, бас және кіші әріп, сан және арнайы таңба"
    },
    register_error_send_code: { ru: "Не удалось отправить код. Проверьте email.", kz: "Кодты жіберу мүмкін болмады. Email тексеріңіз." },
    register_code_resent: { ru: "Код отправлен повторно", kz: "Код қайта жіберілді" },
    register_error_resend_code: { ru: "Не удалось отправить код повторно", kz: "Кодты қайта жіберу мүмкін болмады" },
    register_error_code_length: { ru: "Код состоит из 6 цифр", kz: "Код 6 саннан тұрады" },
    register_error_verify: { ru: "Не удалось подтвердить код. Попробуйте ещё раз.", kz: "Кодты растау мүмкін болмады. Қайта көріңіз." },
    register_title: { ru: "Регистрация", kz: "Тіркелу" },
    register_subtitle: {
        ru: "Для жителей — чтобы отправлять обращения и следить за их статусом",
        kz: "Тұрғындарға арналған — өтініш жіберу және оның мәртебесін бақылау үшін"
    },
    register_fullname_label: { ru: "ФИО", kz: "Аты-жөні" },

    // --- Aitu mini-app ---
    aitu_subtitle: {
        ru: "Обращение по вопросам связи и интернета",
        kz: "Байланыс және интернет мәселелері бойынша өтініш"
    },
    aitu_fullname_placeholder: { ru: "Введите имя и фамилию", kz: "Атыңыз бен тегіңізді енгізіңіз" },
    aitu_select_placeholder: { ru: "Выберите...", kz: "Таңдаңыз..." },
    aitu_operator_unknown: { ru: "Не знаю / пусть определит ИИ", kz: "Білмеймін / ЖИ анықтасын" },
    aitu_description_placeholder: {
        ru: "Опишите проблему — что произошло, где и когда",
        kz: "Мәселені сипаттаңыз — не болды, қайда және қашан"
    },
    aitu_submit: { ru: "Отправить обращение", kz: "Өтінішті жіберу" },
    aitu_submitting: { ru: "Отправка...", kz: "Жіберілуде..." },
    aitu_error_required: {
        ru: "Заполните имя, телефон и описание проблемы",
        kz: "Атыңызды, телефоныңызды және мәселе сипаттамасын толтырыңыз"
    },
    aitu_error_generic: { ru: "Не удалось отправить обращение, попробуйте ещё раз", kz: "Өтінішті жіберу мүмкін болмады, қайта көріңіз" },
    aitu_success_prefix: { ru: "Обращение принято", kz: "Өтініш қабылданды" },
    aitu_success_hint: {
        ru: "Мы свяжемся с вами по указанному номеру телефона.",
        kz: "Сізбен көрсетілген телефон нөмірі арқылы байланысамыз."
    },
    aitu_create_another: { ru: "Отправить ещё одно обращение", kz: "Тағы бір өтініш жіберу" },

    register_fullname_placeholder: { ru: "Введите ФИО", kz: "Аты-жөніңізді енгізіңіз" },
    register_username_placeholder: { ru: "Придумайте логин", kz: "Логин ойлап табыңыз" },
    register_email_placeholder: { ru: "Введите email", kz: "Email енгізіңіз" },
    register_password_placeholder: { ru: "Не менее 6 символов", kz: "Кемінде 6 таңба" },
    register_password_confirm_label: { ru: "Повторите пароль", kz: "Құпия сөзді қайталаңыз" },
    register_password_confirm_placeholder: { ru: "Повторите пароль", kz: "Құпия сөзді қайталаңыз" },
    register_sending_code: { ru: "Отправка кода...", kz: "Код жіберілуде..." },
    register_get_code: { ru: "Получить код на email", kz: "Email-ға код алу" },
    register_have_account: { ru: "Уже есть аккаунт?", kz: "Аккаунтыңыз бар ма?" },
    register_confirm_title: { ru: "Подтверждение email", kz: "Email растау" },
    register_confirm_subtitle_1: { ru: "Мы отправили 6-значный код на", kz: "Біз 6 таңбалы кодты мына мекенжайға жібердік:" },
    register_confirm_subtitle_2: {
        ru: "Введите его, чтобы завершить регистрацию.",
        kz: "Тіркеуді аяқтау үшін оны енгізіңіз."
    },
    register_success: {
        ru: "Регистрация прошла успешно. Переходим на вход...",
        kz: "Тіркелу сәтті өтті. Кіру бетіне өтудеміз..."
    },
    register_code_label: { ru: "Код из письма", kz: "Хаттағы код" },
    register_verifying: { ru: "Проверка...", kz: "Тексерілуде..." },
    register_verify_submit: { ru: "Подтвердить и зарегистрироваться", kz: "Растау және тіркелу" },
    register_no_code: { ru: "Не пришёл код?", kz: "Код келмеді ме?" },
    register_resending: { ru: "Отправка...", kz: "Жіберілуде..." },
    register_resend: { ru: "Отправить ещё раз", kz: "Қайта жіберу" },
    register_change_data: { ru: "Изменить данные", kz: "Деректерді өзгерту" },

    // --- Dashboard ---
    greeting_night: { ru: "Доброй ночи", kz: "Қайырлы түн" },
    greeting_morning: { ru: "Доброе утро", kz: "Қайырлы таң" },
    greeting_day: { ru: "Добрый день", kz: "Қайырлы күн" },
    greeting_evening: { ru: "Добрый вечер", kz: "Қайырлы кеш" },
    dashboard_colleague: { ru: "коллега", kz: "әріптес" },
    dashboard_eyebrow: {
        ru: "SMART AQMOLA · ЦИФРОВАЯ ПЛАТФОРМА",
        kz: "SMART AQMOLA · ЦИФРЛЫҚ ПЛАТФОРМА"
    },
    dashboard_description: {
        ru: "Единая система приёма и обработки обращений жителей Акмолинской области по вопросам связи и интернета — сайт, Telegram и WhatsApp в одном окне, с ИИ-разбором каждого обращения.",
        kz: "Ақмола облысы тұрғындарының байланыс пен интернет мәселелері бойынша өтініштерін қабылдау мен өңдеудің бірыңғай жүйесі — сайт, Telegram және WhatsApp бір терезеде, әр өтінішті ЖИ талдауымен."
    },
    channel_web_label: { ru: "Веб-форма", kz: "Веб-форма" },
    channel_web_note: { ru: "Сайт Smart Aqmola", kz: "Smart Aqmola сайты" },
    channel_telegram_label: { ru: "Telegram", kz: "Telegram" },
    channel_whatsapp_label: { ru: "WhatsApp", kz: "WhatsApp" },
    channel_bot_note: { ru: "Бот для жителей", kz: "Тұрғындарға арналған бот" },

    // --- Tickets list ---
    tickets_loading: { ru: "Загрузка обращений...", kz: "Өтініштер жүктелуде..." },
    tickets_load_error_title: { ru: "Не удалось загрузить обращения", kz: "Өтініштерді жүктеу мүмкін болмады" },
    tickets_retry: { ru: "Повторить загрузку", kz: "Қайта жүктеу" },
    tickets_create_citizen: { ru: "Создать обращение", kz: "Өтініш жасау" },
    tickets_create_staff: { ru: "Создать обращение", kz: "Өтініш жасау" },
    tickets_all_title: { ru: "Все обращения", kz: "Барлық өтініштер" },

    // --- Ticket table & filters ---
    table_default_title: { ru: "Последние обращения", kz: "Соңғы өтініштер" },
    table_export_title: {
        ru: "Экспортировать текущую таблицу (с учётом фильтров) в Excel",
        kz: "Ағымдағы кестені (сүзгілерді ескере отырып) Excel-ге экспорттау"
    },
    table_export_button: { ru: "Экспорт в Excel", kz: "Excel-ге экспорт" },
    table_search_placeholder: { ru: "Поиск по заявителю...", kz: "Өтініш беруші бойынша іздеу..." },
    filter_status_all: { ru: "Все статусы", kz: "Барлық мәртебелер" },
    status_new: { ru: "Новое", kz: "Жаңа" },
    status_progress: { ru: "В работе", kz: "Жұмыста" },
    status_closed: { ru: "Закрыто", kz: "Жабық" },
    filter_operator_all: { ru: "Все операторы", kz: "Барлық операторлар" },
    filter_operator_unknown: { ru: "Не определён", kz: "Анықталмаған" },
    filter_district_all: { ru: "Все районы", kz: "Барлық аудандар" },
    filter_district_unknown: { ru: "Не указан", kz: "Көрсетілмеген" },
    filter_email_all: { ru: "Письмо: все", kz: "Хат: барлығы" },
    filter_email_sent: { ru: "Письмо отправлено", kz: "Хат жіберілді" },
    filter_email_not_sent: { ru: "Письмо не отправлено", kz: "Хат жіберілмеді" },
    filter_date_from: { ru: "с", kz: "бастап" },
    filter_date_to: { ru: "по", kz: "дейін" },
    filter_reset: { ru: "Сбросить", kz: "Тазарту" },
    table_col_number: { ru: "№", kz: "№" },
    table_col_applicant: { ru: "Заявитель", kz: "Өтініш беруші" },
    table_col_phone: { ru: "Телефон", kz: "Телефон" },
    table_col_district: { ru: "Район", kz: "Аудан" },
    table_col_operator: { ru: "Оператор", kz: "Оператор" },
    table_col_category_ai: { ru: "Категория (ИИ)", kz: "Санат (ЖИ)" },
    table_col_status: { ru: "Статус", kz: "Мәртебе" },
    table_col_priority: { ru: "Приоритет", kz: "Басымдық" },
    table_col_date: { ru: "Дата", kz: "Күні" },
    table_col_description: { ru: "Описание", kz: "Сипаттама" },
    table_empty_no_tickets: { ru: "Обращений пока нет", kz: "Әзірге өтініштер жоқ" },
    table_empty_no_match: {
        ru: "По заданным условиям ничего не найдено",
        kz: "Берілген шарттар бойынша ештеңе табылмады"
    },
    priority_low: { ru: "Низкий", kz: "Төмен" },
    priority_medium: { ru: "Средний", kz: "Орташа" },
    priority_high: { ru: "Высокий", kz: "Жоғары" },

    // --- Create/edit ticket modal ---
    modal_error_fullname: { ru: "Введите ФИО", kz: "Аты-жөнін енгізіңіз" },
    modal_error_save: {
        ru: "Не удалось сохранить обращение. Проверьте соединение и попробуйте ещё раз.",
        kz: "Өтінішті сақтау мүмкін болмады. Байланысты тексеріп, қайта көріңіз."
    },
    modal_edit_title: { ru: "Редактирование обращения", kz: "Өтінішті өңдеу" },
    modal_create_title: { ru: "Создание обращения", kz: "Өтініш жасау" },
    modal_operator_ai_placeholder: {
        ru: "Не указан (определит ИИ)",
        kz: "Көрсетілмеген (ЖИ анықтайды)"
    },
    modal_cancel: { ru: "Отмена", kz: "Бас тарту" },
    modal_saving: { ru: "Сохранение...", kz: "Сақталуда..." },
    modal_save_changes: { ru: "Сохранить изменения", kz: "Өзгерістерді сақтау" },
    modal_save: { ru: "Сохранить", kz: "Сақтау" },

    // --- Ticket details ---
    details_error_load_users: { ru: "Не удалось загрузить пользователей", kz: "Пайдаланушыларды жүктеу мүмкін болмады" },
    details_not_found_title: { ru: "Обращение не найдено", kz: "Өтініш табылмады" },
    details_back_to_tickets: { ru: "Вернуться к обращениям", kz: "Өтініштерге оралу" },
    details_error_status: { ru: "Не удалось изменить статус", kz: "Мәртебені өзгерту мүмкін болмады" },
    details_assignee_set: { ru: "Исполнитель назначен", kz: "Орындаушы тағайындалды" },
    details_assignee_removed: { ru: "Исполнитель снят", kz: "Орындаушы алынып тасталды" },
    details_error_assign: { ru: "Не удалось назначить исполнителя", kz: "Орындаушыны тағайындау мүмкін болмады" },
    details_confirm_delete: {
        ru: "Удалить обращение {id}? Это действие нельзя отменить.",
        kz: "{id} өтінішін жою керек пе? Бұл әрекетті кері қайтару мүмкін емес."
    },
    details_error_delete: { ru: "Не удалось удалить обращение", kz: "Өтінішті жою мүмкін болмады" },
    details_error_reanalyze: { ru: "Не удалось выполнить ИИ-анализ", kz: "ЖИ талдауын орындау мүмкін болмады" },
    details_error_send_email: { ru: "Не удалось отправить письмо", kz: "Хатты жіберу мүмкін болмады" },
    details_error_empty_comment: { ru: "Введите текст комментария", kz: "Пікір мәтінін енгізіңіз" },
    details_error_comment: { ru: "Не удалось отправить комментарий", kz: "Пікірді жіберу мүмкін болмады" },
    details_back: { ru: "Назад к обращениям", kz: "Өтініштерге қайту" },
    details_ticket_number: { ru: "Обращение", kz: "Өтініш" },
    details_not_specified: { ru: "Не указано", kz: "Көрсетілмеген" },
    details_not_specified_f: { ru: "Не указана", kz: "Көрсетілмеген" },
    details_source: { ru: "Источник", kz: "Дереккөз" },
    details_category: { ru: "Категория", kz: "Санат" },
    details_current_status: { ru: "Текущий статус", kz: "Ағымдағы мәртебе" },
    details_change_status: { ru: "Изменить статус", kz: "Мәртебені өзгерту" },
    details_assignee: { ru: "Исполнитель", kz: "Орындаушы" },
    details_not_assigned: { ru: "Не назначен", kz: "Тағайындалмаған" },
    details_assigned_staff: { ru: "Назначенный сотрудник", kz: "Тағайындалған қызметкер" },
    details_ai_analysis: { ru: "ИИ-анализ", kz: "ЖИ талдауы" },
    details_analyzing: { ru: "Анализ...", kz: "Талдануда..." },
    details_reanalyze: { ru: "Повторить анализ", kz: "Талдауды қайталау" },
    details_ai_not_run: { ru: "ИИ-анализ ещё не выполнялся.", kz: "ЖИ талдауы әлі орындалған жоқ." },
    details_ai_category: { ru: "Категория (ИИ)", kz: "Санат (ЖИ)" },
    details_ai_operator: { ru: "Оператор (ИИ)", kz: "Оператор (ЖИ)" },
    details_ai_priority: { ru: "Приоритет (ИИ)", kz: "Басымдық (ЖИ)" },
    details_ai_confidence: { ru: "Уверенность ИИ", kz: "ЖИ сенімділігі" },
    details_ai_profanity: { ru: "Обнаружена нецензурная лексика", kz: "Балағат сөздер анықталды" },
    details_ai_not_meaningful: { ru: "ИИ посчитал текст несодержательным", kz: "ЖИ мәтінді мазмұнсыз деп есептеді" },
    details_ai_summary: { ru: "Резюме", kz: "Қорытынды" },
    details_ai_draft_letter: { ru: "Черновик письма оператору", kz: "Операторға хат жобасы" },
    details_email_notification: { ru: "Уведомление оператору", kz: "Операторға хабарландыру" },
    details_email_auto: { ru: "Автоматически (по оператору связи)", kz: "Автоматты түрде (байланыс операторы бойынша)" },
    details_email_or: { ru: "или", kz: "немесе" },
    details_email_manual_placeholder: { ru: "впишите email вручную", kz: "email қолмен енгізіңіз" },
    details_email_send_manual: { ru: "Отправить на этот email", kz: "Осы email-ге жіберу" },
    details_email_clear_manual: { ru: "✕ Отмена", kz: "✕ Бас тарту" },
    details_email_sending: { ru: "Отправка...", kz: "Жіберілуде..." },
    details_email_resend: { ru: "Отправить повторно", kz: "Қайта жіберу" },
    details_email_send: { ru: "Отправить письмо", kz: "Хат жіберу" },
    details_email_sent_to: { ru: "Отправлено на", kz: "Жіберілді:" },
    details_email_status_sent: { ru: "Отправлено", kz: "Жіберілді" },
    details_email_status_not_sent: { ru: "Не отправлено", kz: "Жіберілмеді" },
    details_email_not_sent: { ru: "Не отправлено", kz: "Жіберілмеді" },
    details_no_description: { ru: "Описание отсутствует", kz: "Сипаттама жоқ" },
    details_comments: { ru: "Комментарии", kz: "Пікірлер" },
    details_comments_loading: { ru: "Загрузка комментариев...", kz: "Пікірлер жүктелуде..." },
    details_comments_empty: { ru: "Пока нет ни одного комментария.", kz: "Әзірге пікір жоқ." },
    details_comment_placeholder: { ru: "Написать комментарий...", kz: "Пікір жазу..." },
    details_add_comment: { ru: "Добавить комментарий", kz: "Пікір қосу" },
    details_edit: { ru: "Редактировать", kz: "Өңдеу" },
    details_delete: { ru: "Удалить", kz: "Жою" },
    details_comment_default_author: { ru: "Пользователь", kz: "Пайдаланушы" },
    details_attachments: { ru: "Фото", kz: "Фотосуреттер" },
    details_telegram_reply_title: { ru: "Ответить жителю в Telegram", kz: "Тұрғынға Telegram-да жауап беру" },
    details_telegram_reply_hint: {
        ru: "Сообщение уйдёт напрямую в тот чат, откуда пришло обращение.",
        kz: "Хабарлама тікелей өтініш келген чатқа жіберіледі."
    },
    details_telegram_reply_placeholder: { ru: "Текст ответа...", kz: "Жауап мәтіні..." },
    details_telegram_reply_send: { ru: "Отправить", kz: "Жіберу" },
    details_telegram_reply_empty: {
        ru: "Введите текст или приложите фото",
        kz: "Мәтін енгізіңіз немесе фото тіркеңіз"
    },
    details_telegram_reply_sent: { ru: "Отправлено жителю в Telegram", kz: "Тұрғынға Telegram-да жіберілді" },
    details_telegram_reply_error: {
        ru: "Не удалось отправить ответ в Telegram",
        kz: "Telegram-да жауапты жіберу мүмкін болмады"
    },

    // --- Analytics ---
    analytics_stat_total: { ru: "Всего обращений", kz: "Барлық өтініштер" },
    public_analytics_title: { ru: "Аналитика по обращениям", kz: "Өтініштер бойынша аналитика" },
    public_analytics_loading: { ru: "Загрузка данных...", kz: "Деректер жүктелуде..." },
    public_analytics_error: { ru: "Не удалось загрузить аналитику", kz: "Аналитиканы жүктеу мүмкін болмады" },
    analytics_stat_new: { ru: "Новых", kz: "Жаңа" },
    analytics_stat_progress: { ru: "В работе", kz: "Жұмыста" },
    analytics_stat_closed: { ru: "Закрыто", kz: "Жабық" },
    analytics_stat_sent: { ru: "Отправлено оператору", kz: "Операторға жіберілді" },
    analytics_stat_not_sent: { ru: "Не отправлено", kz: "Жіберілмеді" },
    analytics_welcome: { ru: "Добро пожаловать", kz: "Қош келдіңіз" },
    analytics_subtitle: {
        ru: "Здесь собрана общая аналитика по обращениям.",
        kz: "Мұнда өтініштер бойынша жалпы аналитика жинақталған."
    },
    analytics_powerbi_title: { ru: "Расширенная аналитика (Power BI)", kz: "Кеңейтілген аналитика (Power BI)" },
    analytics_aitu_title: { ru: "Обращение через Aitu", kz: "Aitu арқылы өтініш" },

    analytics_report_title: { ru: "Выгрузка отчёта", kz: "Есепті түсіру" },
    analytics_report_hint: {
        ru: "Скачайте сводку по обращениям в PDF — за весь период или за выбранный промежуток дат.",
        kz: "Өтініштер бойынша қорытындыны PDF түрінде жүктеп алыңыз — барлық кезең үшін немесе таңдалған күндер аралығы үшін."
    },
    analytics_report_preset_day: { ru: "За сегодня", kz: "Бүгінге" },
    analytics_report_preset_week: { ru: "За неделю", kz: "Аптаға" },
    analytics_report_preset_month: { ru: "За месяц", kz: "Айға" },
    analytics_report_preset_all: { ru: "За всё время", kz: "Барлық уақыт үшін" },
    analytics_report_from: { ru: "С даты", kz: "Басталу күні" },
    analytics_report_to: { ru: "По дату", kz: "Аяқталу күні" },
    analytics_report_download: { ru: "Скачать отчёт (PDF)", kz: "Есепті жүктеу (PDF)" },
    analytics_report_download_xlsx: { ru: "Скачать отчёт (Excel)", kz: "Есепті жүктеу (Excel)" },
    analytics_report_downloading: { ru: "Формируется...", kz: "Қалыптасуда..." },
    analytics_report_error: { ru: "Не удалось сформировать отчёт", kz: "Есепті қалыптастыру мүмкін болмады" },

    // --- User management (Users/Staff shared) ---
    usermgmt_error_required: { ru: "Заполните ФИО, логин и email", kz: "Аты-жөнін, логинді және email толтырыңыз" },
    usermgmt_error_password: { ru: "Укажите пароль для новой учётной записи", kz: "Жаңа есептік жазба үшін құпия сөз көрсетіңіз" },
    usermgmt_edit_title: { ru: "Редактирование", kz: "Өңдеу" },
    usermgmt_new_title: { ru: "Новая запись", kz: "Жаңа жазба" },
    usermgmt_new_password: { ru: "Новый пароль (необязательно)", kz: "Жаңа құпия сөз (міндетті емес)" },
    usermgmt_role: { ru: "Роль", kz: "Рөл" },
    usermgmt_active_checkbox: { ru: "Активен (может входить в систему)", kz: "Белсенді (жүйеге кіре алады)" },
    usermgmt_confirm_delete: { ru: "Удалить эту запись?", kz: "Бұл жазбаны жою керек пе?" },
    usermgmt_admin_only: {
        ru: "Доступ к этому разделу есть только у администратора.",
        kz: "Бұл бөлімге тек әкімші кіре алады."
    },
    usermgmt_loading: { ru: "Загрузка...", kz: "Жүктелуде..." },
    usermgmt_status: { ru: "Статус", kz: "Мәртебе" },
    usermgmt_actions: { ru: "Действия", kz: "Әрекеттер" },
    usermgmt_empty: { ru: "Пока никого нет", kz: "Әзірге ешкім жоқ" },
    usermgmt_active: { ru: "Активен", kz: "Белсенді" },
    usermgmt_disabled: { ru: "Отключён", kz: "Өшірілген" },
    usermgmt_change: { ru: "Изменить", kz: "Өзгерту" },
    users_page_title: { ru: "Пользователи (жители)", kz: "Пайдаланушылар (тұрғындар)" },
    users_add_button: { ru: "Добавить жителя", kz: "Тұрғын қосу" },
    staff_add_button: { ru: "Добавить сотрудника", kz: "Қызметкер қосу" },

    // --- Email operators page ---
    emailops_error_required: { ru: "Выберите оператора и укажите email", kz: "Операторды таңдап, email көрсетіңіз" },
    emailops_edit_title: { ru: "Редактирование оператора", kz: "Операторды өңдеу" },
    emailops_new_title: { ru: "Новый оператор связи", kz: "Жаңа байланыс операторы" },
    emailops_operator_label: { ru: "Оператор связи / компания", kz: "Байланыс операторы / компания" },
    emailops_operator_placeholder: {
        ru: "Например: Kcell, или название другой компании",
        kz: "Мысалы: Kcell немесе басқа компанияның атауы"
    },
    emailops_email_label: { ru: "Email для писем по этому оператору", kz: "Осы оператор бойынша хаттарға арналған email" },
    emailops_secondary_email_label: {
        ru: "Второй email (необязательно, тоже получит письмо)",
        kz: "Екінші email (міндетті емес, ол да хат алады)"
    },
    emailops_tertiary_email_label: {
        ru: "Третий email (необязательно, тоже получит письмо)",
        kz: "Үшінші email (міндетті емес, ол да хат алады)"
    },
    emailops_active_checkbox: {
        ru: "Активен (письма по этому оператору доставляются)",
        kz: "Белсенді (осы оператор бойынша хаттар жеткізіледі)"
    },
    emailops_no_tickets_yet: { ru: "Этому оператору ещё ничего не отправлялось.", kz: "Бұл операторға әлі ештеңе жіберілген жоқ." },
    emailops_confirm_delete: { ru: "Удалить этого оператора из списка рассылки?", kz: "Бұл операторды таратылым тізімінен жою керек пе?" },
    emailops_loading: { ru: "Загрузка операторов рассылки...", kz: "Таратылым операторлары жүктелуде..." },
    emailops_description: {
        ru: "Письмо по каждому обращению уходит на email того оператора связи, который указан в самом обращении (вручную или по определению ИИ) — у каждого оператора должен быть указан свой email.",
        kz: "Әр өтініш бойынша хат өтініште көрсетілген байланыс операторының email-іне жіберіледі (қолмен немесе ЖИ анықтауы бойынша) — әр оператордың өз email-і көрсетілуі керек."
    },
    emailops_add_button: { ru: "Добавить оператора", kz: "Оператор қосу" },
    emailops_sent_count: { ru: "Обращений отправлено", kz: "Жіберілген өтініштер" },
    emailops_empty: { ru: "Список пуст — добавьте первого оператора", kz: "Тізім бос — алғашқы операторды қосыңыз" },

    // --- Incoming emails page ---
    incoming_no_subject: { ru: "(без темы)", kz: "(тақырыпсыз)" },
    incoming_from: { ru: "От", kz: "Кімнен" },
    incoming_received: { ru: "Получено", kz: "Алынды" },
    incoming_empty_body: { ru: "(пустое письмо)", kz: "(бос хат)" },
    incoming_no_new: { ru: "Новых писем нет", kz: "Жаңа хаттар жоқ" },
    incoming_fetched: { ru: "Забрано новых писем", kz: "Алынған жаңа хаттар" },
    incoming_matched: { ru: "привязано к обращениям", kz: "өтініштерге байланыстырылды" },
    incoming_admin_specialist_only: {
        ru: "Доступ к этому разделу есть только у администратора и специалиста.",
        kz: "Бұл бөлімге тек әкімші мен маман кіре алады."
    },
    incoming_loading: { ru: "Загрузка входящих писем...", kz: "Кіріс хаттар жүктелуде..." },
    incoming_description: {
        ru: "Письма, пришедшие на почтовый ящик CRM — в первую очередь ответы операторов связи на уведомления по обращениям. Почта проверяется автоматически каждые пару минут, либо можно проверить прямо сейчас.",
        kz: "CRM пошта жәшігіне келген хаттар — ең алдымен байланыс операторларының өтініштер бойынша хабарландыруларға жауаптары. Пошта әр бірнеше минут сайын автоматты түрде тексеріледі, немесе қазір тексеруге болады."
    },
    incoming_checking: { ru: "Проверка...", kz: "Тексерілуде..." },
    incoming_check_now: { ru: "Проверить почту сейчас", kz: "Поштаны қазір тексеру" },
    incoming_col_from: { ru: "От кого", kz: "Кімнен" },
    incoming_col_subject: { ru: "Тема", kz: "Тақырып" },
    incoming_col_received: { ru: "Получено", kz: "Алынды" },
    incoming_empty: { ru: "Писем пока нет", kz: "Әзірге хаттар жоқ" },

    // --- Placeholder pages ---
    national_projects_placeholder: {
        ru: "Раздел в разработке: здесь появится информация по национальным проектам, связанным с цифровизацией связи.",
        kz: "Бөлім әзірленуде: мұнда байланысты цифрландыруға қатысты ұлттық жобалар туралы ақпарат пайда болады."
    },
    cybersecurity_placeholder: {
        ru: "Раздел в разработке: здесь появятся журналы доступа, политики безопасности и правила обработки данных.",
        kz: "Бөлім әзірленуде: мұнда қатынау журналдары, қауіпсіздік саясаттары және деректерді өңдеу ережелері пайда болады."
    },

    // --- AI categories (fixed list from ai_service.py) ---
    category_bad_quality: { ru: "Плохое качество связи", kz: "Байланыс сапасының нашарлығы" },
    category_no_internet: { ru: "Нет доступа к интернету", kz: "Интернетке қолжетімділік жоқ" },
    category_slow_internet: { ru: "Медленный интернет", kz: "Баяу интернет" },
    category_line_break: { ru: "Обрыв линии / авария", kz: "Желі үзілісі / апат" },
    category_sim_problem: { ru: "Проблема с SIM-картой", kz: "SIM-картамен байланысты мәселе" },
    category_billing: { ru: "Тарификация и биллинг", kz: "Тарифтеу және билинг" },
    category_other: { ru: "Иное", kz: "Басқа" },
    category_undetermined: { ru: "Не определено ИИ", kz: "ЖИ анықтамады" },

    // --- Charts ---
    chart_category_title: { ru: "Обращения по категориям (ИИ-анализ)", kz: "Санаттар бойынша өтініштер (ЖИ талдауы)" },
    chart_district_bar_title: { ru: "Обращения по районам", kz: "Аудандар бойынша өтініштер" },
    chart_district_pie_title: { ru: "Распределение обращений по районам", kz: "Өтініштердің аудандар бойынша таралуы" },
    chart_no_data: { ru: "Пока нет данных", kz: "Әзірге деректер жоқ" },
    chart_other_districts: { ru: "Другие районы", kz: "Басқа аудандар" },
    chart_total: { ru: "всего", kz: "барлығы" },
    chart_density_title: { ru: "Динамика обращений", kz: "Өтініштер динамикасы" },
    chart_heatmap_title: { ru: "карта обращений по дням", kz: "Күндер бойынша өтініштердің картасы" },
    chart_heatmap_hint: { ru: "Наведите на квадрат, чтобы увидеть дату", kz: "Күнді көру үшін шаршыға меңзерді апарыңыз" },
    chart_heatmap_count_suffix: { ru: "обращ.", kz: "өтініш" },
    chart_heatmap_less: { ru: "меньше", kz: "азырақ" },
    chart_heatmap_more: { ru: "больше", kz: "көбірек" },
    chart_period: { ru: "за период", kz: "кезең үшін" },

    // --- Coverage map ---
    coverage_load_error: { ru: "Не удалось загрузить данные покрытия", kz: "Қамту деректерін жүктеу мүмкін болмады" },
    coverage_loading: { ru: "Загрузка карты покрытия...", kz: "Қамту картасы жүктелуде..." },
    coverage_no_data: { ru: "Данные о покрытии сети связи ещё не загружены.", kz: "Байланыс желісінің қамту деректері әлі жүктелген жоқ." },
    coverage_title: { ru: "Обращения по районам", kz: "Аудандар бойынша өтініштер" },
    coverage_towers_count: { ru: "обращений привязано к карте", kz: "картаға байланысты өтініш" },
    coverage_disclaimer: {
        ru: "Цифра в кружке — сколько обращений пришло из этого района/города. Чем больше кружок, тем больше обращений.",
        kz: "Дөңгелектегі сан — осы аудан/қаладан қанша өтініш келгенін көрсетеді. Дөңгелек неғұрлым үлкен болса, соғұрлым өтініш көп."
    },

    // === END ===
}
