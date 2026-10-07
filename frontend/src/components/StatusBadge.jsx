import { useLanguage } from "../context/LanguageContext"

const STATUS_KEYS = {
    "Новое": "status_new",
    "В работе": "status_progress",
    "Закрыто": "status_closed"
}

function StatusBadge({ status }) {

    const { t } = useLanguage()

    let className = "status"

    if (status === "Новое") {
        className += " status-new"
    } else if (status === "В работе") {
        className += " status-progress"
    } else if (status === "Закрыто") {
        className += " status-closed"
    }

    const label = STATUS_KEYS[status]
        ? t(STATUS_KEYS[status])
        : status

    return (
        <span className={className}>
            {label}
        </span>
    )
}

export default StatusBadge
