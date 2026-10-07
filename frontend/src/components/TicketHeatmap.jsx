import { useMemo, useState } from "react"

import { CalendarIcon } from "./icons"
import { useLanguage } from "../context/LanguageContext"

const MONTH_NAMES_RU = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
]

const MONTH_NAMES_KZ = [
    "Қаңтар", "Ақпан", "Наурыз", "Сәуір", "Мамыр", "Маусым",
    "Шілде", "Тамыз", "Қыркүйек", "Қазан", "Қараша", "Желтоқсан"
]

const WEEKDAY_NAMES_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
const WEEKDAY_NAMES_KZ = ["Дс", "Сс", "Ср", "Бс", "Жм", "Сб", "Жс"]

function toISODate(date) {
    return date.toISOString().slice(0, 10)
}

// Понедельник — начало недели.
function startOfWeekMonday(date) {

    const result = new Date(date)
    const day = result.getDay()
    const diff = day === 0 ? -6 : 1 - day

    result.setDate(result.getDate() + diff)
    result.setHours(0, 0, 0, 0)

    return result
}

function buildMonthGrid(viewDate, tickets) {

    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const countByDate = {}

    tickets.forEach((ticket) => {
        if (!ticket.created_date) {
            return
        }
        countByDate[ticket.created_date] =
            (countByDate[ticket.created_date] || 0) + 1
    })

    const firstOfMonth = new Date(year, month, 1)
    const lastOfMonth = new Date(year, month + 1, 0)

    const gridStart = startOfWeekMonday(firstOfMonth)
    const gridEnd = startOfWeekMonday(lastOfMonth)
    gridEnd.setDate(gridEnd.getDate() + 6)

    const weeks = []
    const cursor = new Date(gridStart)

    while (cursor <= gridEnd) {

        const week = []

        for (let i = 0; i < 7; i++) {

            const inMonth = cursor.getMonth() === month
            const iso = toISODate(cursor)
            const isFuture = cursor > today

            week.push({
                iso,
                date: new Date(cursor),
                inMonth,
                count: (!inMonth || isFuture) ? null : (countByDate[iso] || 0)
            })

            cursor.setDate(cursor.getDate() + 1)
        }

        weeks.push(week)
    }

    const maxCount = Math.max(
        1,
        ...weeks.flat()
            .filter((cell) => cell.inMonth && cell.count !== null)
            .map((cell) => cell.count)
    )

    return { weeks, maxCount }
}

function intensityLevel(count, maxCount) {

    if (!count) {
        return 0
    }

    const ratio = count / maxCount

    if (ratio > 0.75) return 4
    if (ratio > 0.5) return 3
    if (ratio > 0.25) return 2

    return 1
}

function TicketHeatmap({ tickets }) {

    const { t, language } = useLanguage()
    const [hoverCell, setHoverCell] = useState(null)

    const [viewDate, setViewDate] = useState(() => {
        const now = new Date()
        return new Date(now.getFullYear(), now.getMonth(), 1)
    })

    const { weeks, maxCount } = useMemo(
        () => buildMonthGrid(viewDate, tickets),
        [viewDate, tickets]
    )

    const monthNames = language === "kz" ? MONTH_NAMES_KZ : MONTH_NAMES_RU
    const weekdayNames = language === "kz" ? WEEKDAY_NAMES_KZ : WEEKDAY_NAMES_RU

    const isCurrentMonth = (() => {
        const now = new Date()
        return (
            viewDate.getFullYear() === now.getFullYear() &&
            viewDate.getMonth() === now.getMonth()
        )
    })()

    function goToPreviousMonth() {
        setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
    }

    function goToNextMonth() {
        if (isCurrentMonth) {
            return
        }
        setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
    }

    function formatDateLabel(date) {
        return date.toLocaleDateString(
            language === "kz" ? "kk-KZ" : "ru-RU",
            { day: "numeric", month: "long" }
        )
    }

    return (
        <div className="chart-card heatmap-card">

            <div className="chart-card-header">
                <h3>
                    <CalendarIcon className="chart-title-icon" /> {t("chart_heatmap_title")}
                </h3>
            </div>

            <div className="heatmap-nav">

                <button
                    type="button"
                    className="heatmap-nav-btn"
                    onClick={goToPreviousMonth}
                    aria-label="previous month"
                >
                    ‹
                </button>

                <span className="heatmap-nav-label">
                    {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
                </span>

                <button
                    type="button"
                    className="heatmap-nav-btn"
                    onClick={goToNextMonth}
                    disabled={isCurrentMonth}
                    aria-label="next month"
                >
                    ›
                </button>

            </div>

            <div className="heatmap-weekday-row">
                {weekdayNames.map((name) => (
                    <span key={name} className="heatmap-weekday-label">
                        {name}
                    </span>
                ))}
            </div>

            <div className="heatmap-month-grid">
                {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="heatmap-week-row">
                        {week.map((cell) => (
                            <div
                                key={cell.iso}
                                className={
                                    !cell.inMonth
                                        ? "heatmap-cell heatmap-cell-outside"
                                        : cell.count === null
                                            ? "heatmap-cell heatmap-cell-future"
                                            : `heatmap-cell heatmap-level-${intensityLevel(cell.count, maxCount)}`
                                }
                                onMouseEnter={() =>
                                    cell.inMonth && setHoverCell(cell)
                                }
                                onMouseLeave={() => setHoverCell(null)}
                            >
                                <span className="heatmap-day-number">
                                    {cell.inMonth ? cell.date.getDate() : ""}
                                </span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            <div className="heatmap-footer">

                <span className="heatmap-tooltip-text">
                    {hoverCell && hoverCell.count !== null
                        ? `${formatDateLabel(hoverCell.date)}: ${hoverCell.count} ${t("chart_heatmap_count_suffix")}`
                        : t("chart_heatmap_hint")}
                </span>

                <div className="heatmap-legend">
                    <span>{t("chart_heatmap_less")}</span>
                    <span className="heatmap-legend-dot heatmap-level-0" />
                    <span className="heatmap-legend-dot heatmap-level-1" />
                    <span className="heatmap-legend-dot heatmap-level-2" />
                    <span className="heatmap-legend-dot heatmap-level-3" />
                    <span className="heatmap-legend-dot heatmap-level-4" />
                    <span>{t("chart_heatmap_more")}</span>
                </div>

            </div>

        </div>
    )
}

export default TicketHeatmap
