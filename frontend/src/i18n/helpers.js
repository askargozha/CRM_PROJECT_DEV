const PRIORITY_KEYS = {
    "Низкий": "priority_low",
    "Средний": "priority_medium",
    "Высокий": "priority_high"
}

export function translatePriority(priority, t) {
    return PRIORITY_KEYS[priority]
        ? t(PRIORITY_KEYS[priority])
        : priority
}

const CATEGORY_KEYS = {
    "Плохое качество связи": "category_bad_quality",
    "Нет доступа к интернету": "category_no_internet",
    "Медленный интернет": "category_slow_internet",
    "Обрыв линии / авария": "category_line_break",
    "Проблема с SIM-картой": "category_sim_problem",
    "Тарификация и биллинг": "category_billing",
    "Иное": "category_other"
}

export function translateCategory(category, t) {
    return CATEGORY_KEYS[category]
        ? t(CATEGORY_KEYS[category])
        : category
}

const DISTRICT_KZ_NAMES = {
    "Аккольский": "Ақкөл ауданы",
    "Аршалынский": "Аршалы ауданы",
    "Астраханский": "Астрахан ауданы",
    "Атбасарский": "Атбасар ауданы",
    "Буландынский": "Бұланды ауданы",
    "Бурабайский": "Бурабай ауданы",
    "Егиндыкольский": "Егіндікөл ауданы",
    "Ерейментауский": "Ерейментау ауданы",
    "Есильский": "Есіл ауданы",
    "Жаксынский": "Жақсы ауданы",
    "Жаркаинский": "Жарқайың ауданы",
    "Зерендинский": "Зеренді ауданы",
    "Коргалжынский": "Қорғалжын ауданы",
    "район Биржан сал": "Біржан сал ауданы",
    "Сандыктауский": "Сандықтау ауданы",
    "Целиноградский": "Целиноград ауданы",
    "Шортандинский": "Шортанды ауданы",
    "г. Кокшетау": "Көкшетау қаласы"
}

export function translateDistrict(district, language, t) {

    if (!district) {
        return t("filter_district_unknown")
    }

    if (language === "kz" && DISTRICT_KZ_NAMES[district]) {
        return DISTRICT_KZ_NAMES[district]
    }

    return district
}
