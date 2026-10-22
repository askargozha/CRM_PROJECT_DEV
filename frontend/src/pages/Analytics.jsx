import { useCallback, useEffect, useMemo, useState } from "react"

import { useNavigate, useSearchParams  } from "react-router-dom"
import StatCard from "../components/StatCard"
import CategoryChart from "../components/CategoryChart"
import MessagesDensityChart from "../components/MessagesDensityChart"
import DistrictBarChart from "../components/DistrictBarChart"
import DistrictPieChart from "../components/DistrictPieChart"
import BreakdownCard from "../components/BreakdownCard"
import DistrictCategoryHeatmap from "../components/DistrictCategoryHeatmap"
import { AlertIcon, CheckIcon, DotIcon, InboxIcon, MapPinIcon } from "../components/icons"
import { useAuth } from "../context/AuthContext"
import { useLanguage } from "../context/LanguageContext"
import { translateDistrict } from "../i18n/helpers"
import { getTicketsAnalyticsSummary, downloadTicketsReport } from "../api/ticketApi"

const CITIZEN_ROLE_NAME = "Пользователь"

function toDateInputValue(date) {
    return date.toISOString().slice(0, 10)
}

// Сколько дней входит в готовые периоды
const PERIOD_DAYS = {
    "7d": 7,
    "30d": 30,
    "quarter": 90,
    "year": 365
}

const PERIOD_OPTIONS = [
    { key: "7d", labelKey: "analytics_period_7d" },
    { key: "30d", labelKey: "analytics_period_30d" },
    { key: "quarter", labelKey: "analytics_period_quarter" },
    { key: "year", labelKey: "analytics_period_year" },
    { key: "custom", labelKey: "analytics_period_custom" }
]

// Локальная дата в формате YYYY-MM-DD (toISOString даёт UTC и может съехать на день у нас, в UTC+5).
function toLocalDateString(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
}

function addDays(dateString, days) {
    const [y, m, d] = dateString.split("-").map(Number)
    return toLocalDateString(new Date(y, m - 1, d + days))
}

function daysBetween(fromString, toString) {
    const [y1, m1, d1] = fromString.split("-").map(Number)
    const [y2, m2, d2] = toString.split("-").map(Number)
    return Math.round(
        (Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000
    )
}

// Возвращает текущий период и предыдущий такой же длины:
// { from, to, prevFrom, prevTo } (все строки YYYY-MM-DD, границы включительно). null — если «свой период» ещё не заполнен.
function getPeriodRange(period, customFrom, customTo) {

    let from
    let to

    if (period === "custom") {
        if (!customFrom || !customTo) {
            return null
        }

        // если даты перепутаны местами — меняем
        from = customFrom <= customTo ? customFrom : customTo
        to = customFrom <= customTo ? customTo : customFrom

    } else {
        to = toLocalDateString(new Date())
        from = addDays(to, -(PERIOD_DAYS[period] - 1))

    }

    const length = daysBetween(from, to) + 1
    const prevTo = addDays(from, -1)
    const prevFrom = addDays(prevTo, -(length - 1))

    return { from, to, prevFrom, prevTo }
}

function filterByDates(items, from, to) {
    return items.filter(
        item =>
            item.created_date &&
            item.created_date >= from &&
            item.created_date <= to
    )
}

// Изменение в процентах к прошлому периоду.
// null — сравнивать не с чем (в прошлом периоде было 0 обращений).
function calcChangePercent(current, previous) {
    if (previous === 0) {
        return current === 0 ? 0 : null
    }

    return Math.round(((current - previous) / previous) * 1000) / 10
}

function countStats(items) {
    const sent = items.filter(item => item.email_sent).length

    return {
        total: items.length,
        newCount: items.filter(item => item.status === "Новое").length,
        inProgress: items.filter(item => item.status === "В работе").length,
        closed: items.filter(item => item.status === "Закрыто").length,
        sent,
        notSent: items.length - sent
    }
}

function Analytics() {
    const { user } = useAuth()
    const { t, language } = useLanguage()
    const navigate = useNavigate()

    const isCitizen = user?.role_name === CITIZEN_ROLE_NAME
    // Переход в список по клику доступен только сотрудникам: у жителя в списке «Мои обращения» только его собственные обращения
    const canDrill = !isCitizen

    // Общая аналитика — по ВСЕМ обращениям (без персональных данных),
    // доступна и роли "Пользователь", а не только сотрудникам.
    const [summary, setSummary] = useState([])
    const [summaryLoading, setSummaryLoading] = useState(true)

    // Период дашборда: по умолчанию последние 30 дней.
    // Период хранится в адресной строке: ?period=7d, а для своего периода
    // ещё &from=ГГГГ-ММ-ДД&to=ГГГГ-ММ-ДД. По умолчанию 30 дней.
    const [searchParams, setSearchParams] = useSearchParams()

    const rawPeriod = searchParams.get("period")
    const period = PERIOD_OPTIONS.some((option) => option.key === rawPeriod)
        ? rawPeriod
        : "30d"
    const customFrom = searchParams.get("from") || ""
    const customTo = searchParams.get("to") || ""

    // Меняет параметры в адресе. Пустое значение удаляет параметр.
    function updateParams(changes) {

        const next = new URLSearchParams(searchParams)

        Object.entries(changes).forEach(([key, value]) => {
            if (value) {
                next.set(key, value)
            } else {
                next.delete(key)
            }
        })

        setSearchParams(next, { replace: true })
    }

    useEffect(() => {
        if (!searchParams.get("period")) {
            updateParams({ period })
        }
    }, []) 

    const [reportDateFrom, setReportDateFrom] = useState("")
    const [reportDateTo, setReportDateTo] = useState("")
    const [downloadingReport, setDownloadingReport] = useState(null)
    const [reportError, setReportError] = useState("")

    useEffect(() => {

        let cancelled = false

        getTicketsAnalyticsSummary()
            .then(({ data }) => {
                if (!cancelled) {
                    setSummary(data)
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setSummary([])
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setSummaryLoading(false)
                }
            })

        return () => {
            cancelled = true
        }

    }, [])

    const range = useMemo(
        () => getPeriodRange(period, customFrom, customTo),
        [period, customFrom, customTo]
    )

    // Обращения за выбранный период. Пока «свой период» не заполнен
    // (range === null), показываем всё без фильтра.
    const periodSummary = useMemo(
        () => range ? filterByDates(summary, range.from, range.to) : summary,
        [summary, range]
    )

    // Обращения за предыдущий период такой же длины — для сравнения.
    const previousSummary = useMemo(
        () => range ? filterByDates(summary, range.prevFrom, range.prevTo) : null,
        [summary, range]
    )

    const stats = useMemo(() => {

        const current = countStats(periodSummary)
        const previous = previousSummary ? countStats(previousSummary) : null

        // goodWhen — в какую сторону изменение считается «хорошим»
        // (зелёным): "up" — рост это хорошо, "down" — снижение это хорошо,
        // null — нейтрально (просто показываем направление).
        function makeCard(key, title, field, icon, variant, goodWhen) {
            return {
                key,
                title,
                value: current[field],
                icon,
                variant,
                goodWhen,
                change: previous
                    ? { percent: calcChangePercent(current[field], previous[field]) }
                    : null
            }
        }

        const result = [
            makeCard(
                "total", t("analytics_stat_total"), "total",
                <InboxIcon className="card-icon-svg" />, "total", null
            ),
            makeCard(
                "new", t("analytics_stat_new"), "newCount",
                <DotIcon className="card-icon-svg icon-new" />, "new", "down"
            ),
            makeCard(
                "progress", t("analytics_stat_progress"), "inProgress",
                <DotIcon className="card-icon-svg icon-progress" />, "progress", null
            ),
            makeCard(
                "closed", t("analytics_stat_closed"), "closed",
                <DotIcon className="card-icon-svg icon-closed" />, "closed", "up"
            )
        ]

        // Статус отправки письма оператору — внутренняя, рабочая
        // информация, жителям её не показываем.
        if (!isCitizen) {

            result.push(
                makeCard(
                    "sent", t("analytics_stat_sent"), "sent",
                    <CheckIcon className="card-icon-svg icon-closed" />, "closed", "up"
                ),
                makeCard(
                    "not-sent", t("analytics_stat_not_sent"), "notSent",
                    <AlertIcon className="card-icon-svg icon-new" />, "new", "down"
                )
            )
        }

        return result

    }, [periodSummary, previousSummary, t, isCitizen])

    // Значения признаков для разрезов. Оператор — тот, что указан в
    // обращении, а если не указан — определённый ИИ.
    const getOperatorLabel = useCallback(
        (ticket) =>
            ticket.operator || t("filter_operator_unknown"),
        [t]
    )

    const getDistrictLabel = useCallback(
        (ticket) => ticket.district || t("filter_district_unknown"),
        [t]
    )

    const getSourceLabel = useCallback(
        (ticket) => ticket.source || t("filter_district_unknown"),
        [t]
    )

    // Как показывать источник «Внешняя CRM» в базе это ЕКЦ 109
    function formatSourceLabel(label) {
        return label === "Внешняя CRM" ? "ЕКЦ 109" : label
    }
    // Открывает список обращений с выбранным фильтром и теми же датами, что выбраны на странице аналитики
    function openTickets(filters) {
        const params = new URLSearchParams()

        Object.entries(filters).forEach(([key, value]) => {
            if (value) {
                params.set(key, value)
            }
        })
        if (range) {
            params.set("date_from", range.from)
            params.set("date_to", range.to)
        }
        navigate(`/tickets?${params.toString()}`)
    }

    function applyPreset(preset) {

        const today = new Date()
        const from = new Date(today)

        if (preset === "day") {
            // сегодня — from = to = сегодня
        } else if (preset === "week") {
            from.setDate(from.getDate() - 7)
        } else if (preset === "month") {
            from.setMonth(from.getMonth() - 1)
        } else if (preset === "all") {
            setReportDateFrom("")
            setReportDateTo("")
            return
        }

        setReportDateFrom(toDateInputValue(from))
        setReportDateTo(toDateInputValue(today))
    }

    async function handleDownloadReport(format) {

        try {

            setDownloadingReport(format)
            setReportError("")

            await downloadTicketsReport(
                reportDateFrom || null,
                reportDateTo || null,
                format
            )

        } catch (error) {

            setReportError(
                error.message ||
                t("analytics_report_error")
            )

        } finally {

            setDownloadingReport(null)

        }
    }

    return (
        <div>

            <div className="period-filter">

                <div className="period-filter-buttons">
                    {PERIOD_OPTIONS.map((option) => (
                        <button
                            key={option.key}
                            type="button"
                            className={
                                period === option.key
                                    ? "edit-btn period-btn active"
                                    : "edit-btn period-btn"
                            }
                            onClick={() => updateParams( option.key === "custom"
                                        ? { period: option.key }
                                        : { period: option.key, from: "", to: "" }
                                )
                            }
                        >
                            {t(option.labelKey)}
                        </button>
                    ))}
                </div>

                {period === "custom" && (
                    <div className="report-date-range">

                        <label>
                            {t("analytics_period_from")}
                            <input
                                type="date"
                                className="modal-input"
                                value={customFrom}
                                max={customTo || undefined}
                                onChange={(event) =>
                                    updateParams({ from: event.target.value })
                                }
                            />
                        </label>

                        <label>
                            {t("analytics_period_to")}
                            <input
                                type="date"
                                className="modal-input"
                                value={customTo}
                                min={customFrom || undefined}
                                onChange={(event) =>
                                    updateParams({ to: event.target.value })
                                }
                            />
                        </label>

                    </div>
                )}

                {period === "custom" && !range && (
                    <p className="period-filter-hint">
                        {t("analytics_period_pick_dates")}
                    </p>
                )}

            </div>
            
            {summaryLoading && (
                <div className="page-message">
                    <div className="loader"></div>
                    <p>{t("analytics_loading")}</p>
                </div>
            )}

            {!summaryLoading && periodSummary.length === 0 && (
                <p className="analytics-empty-period">
                    {t("analytics_empty_period")}
                </p>
            )}

            <div className="cards">
                {!summaryLoading && stats.map((item) => (
                    <StatCard
                        key={item.key}
                        title={item.title}
                        value={item.value}
                        icon={item.icon}
                        variant={item.variant}
                        change={item.change}
                        goodWhen={item.goodWhen}
                        vsText={t("analytics_change_vs_prev")}
                        noDataText={t("analytics_change_no_data")}
                    />
                ))}
            </div>

            <div className="analytics-top-grid">

                <div className="analytics-left-column">

                    {!summaryLoading && (
                        <>
                            <DistrictPieChart tickets={periodSummary} />
                            <MessagesDensityChart tickets={periodSummary} compact />
                        </>
                    )}

                </div>

                <div className="powerbi-embed-card analytics-powerbi-tall">
                    <h3>{t("analytics_powerbi_title")}</h3>
                    <iframe
                        title="Power BI"
                        src="https://app.powerbi.com/view?r=eyJrIjoiYzllNDJlMTMtY2I3Yy00ZWQwLTg2ZDMtMTc0ZDA2ODdhM2U2IiwidCI6IjEzZWY1ZWQwLTliZmYtNGE2Yi1hN2IyLTZiOTI4YmYzZmE1ZiIsImMiOjl9"
                        allowFullScreen
                        className="powerbi-embed-frame analytics-powerbi-frame-tall"
                    />
                </div>

            </div>

            <div className="chart-panels-row-centered">
                <div className="chart-panels-row chart-panels-row-large">

                    {!isCitizen && (
                        <div className="report-download-card">

                            <h3>{t("analytics_report_title")}</h3>

                            <p className="report-download-hint">
                                {t("analytics_report_hint")}
                            </p>

                            <div className="report-preset-buttons">
                                <button
                                    type="button"
                                    className="edit-btn"
                                    onClick={() => applyPreset("day")}
                                >
                                    {t("analytics_report_preset_day")}
                                </button>
                                <button
                                    type="button"
                                    className="edit-btn"
                                    onClick={() => applyPreset("week")}
                                >
                                    {t("analytics_report_preset_week")}
                                </button>
                                <button
                                    type="button"
                                    className="edit-btn"
                                    onClick={() => applyPreset("month")}
                                >
                                    {t("analytics_report_preset_month")}
                                </button>
                                <button
                                    type="button"
                                    className="edit-btn"
                                    onClick={() => applyPreset("all")}
                                >
                                    {t("analytics_report_preset_all")}
                                </button>
                            </div>

                            <div className="report-date-range">

                                <label>
                                    {t("analytics_report_from")}
                                    <input
                                        type="date"
                                        className="modal-input"
                                        value={reportDateFrom}
                                        onChange={(event) =>
                                            setReportDateFrom(event.target.value)
                                        }
                                    />
                                </label>

                                <label>
                                    {t("analytics_report_to")}
                                    <input
                                        type="date"
                                        className="modal-input"
                                        value={reportDateTo}
                                        onChange={(event) =>
                                            setReportDateTo(event.target.value)
                                        }
                                    />
                                </label>

                                <button
                                    type="button"
                                    className="create-btn"
                                    onClick={() => handleDownloadReport("pdf")}
                                    disabled={!!downloadingReport}
                                >
                                    {downloadingReport === "pdf"
                                        ? t("analytics_report_downloading")
                                        : t("analytics_report_download")}
                                </button>

                                <button
                                    type="button"
                                    className="edit-btn"
                                    onClick={() => handleDownloadReport("xlsx")}
                                    disabled={!!downloadingReport}
                                >
                                    {downloadingReport === "xlsx"
                                        ? t("analytics_report_downloading")
                                        : t("analytics_report_download_xlsx")}
                                </button>

                            </div>

                            {reportError && (
                                <p style={{ color: "#B4402F", fontSize: 13.5, marginTop: 10 }}>
                                    {reportError}
                                </p>
                            )}

                        </div>
                    )}

                    {!summaryLoading && (
                        <>
                            <DistrictBarChart tickets={periodSummary} />
                            <CategoryChart tickets={periodSummary} />
                        </>
                    )}

                </div>
            </div>

            {!summaryLoading && (
                <div className="chart-panels-row-centered">
                    <div className="chart-panels-row chart-panels-row-large">

                        <BreakdownCard
                            title={t("analytics_breakdown_operators")}
                            tickets={periodSummary}
                            prevTickets={previousSummary}
                            getLabel={getOperatorLabel}
                            onRowClick={
                                canDrill
                                    ? (label) => openTickets({ operator: label })
                                    : undefined
                            }
                            emptyText={t("chart_no_data")}
                            noDataText={t("analytics_change_no_data")}
                        />

                        <BreakdownCard
                            title={t("analytics_breakdown_districts")}
                            icon={<MapPinIcon className="chart-title-icon" />}
                            tickets={periodSummary}
                            prevTickets={previousSummary}
                            getLabel={getDistrictLabel}
                            onRowClick={
                                canDrill
                                    ? (label) => openTickets({ district: label })
                                    : undefined
                            }                            
                            formatLabel={(label) =>
                                translateDistrict(label, language, t)
                            }
                            emptyText={t("chart_no_data")}
                            noDataText={t("analytics_change_no_data")}
                        />

                        <BreakdownCard
                            title={t("analytics_breakdown_sources")}
                            tickets={periodSummary}
                            prevTickets={previousSummary}
                            getLabel={getSourceLabel}
                            formatLabel={formatSourceLabel}
                            emptyText={t("chart_no_data")}
                            noDataText={t("analytics_change_no_data")}
                        />

                    </div>
                </div>
            )}
            {!summaryLoading && (
                <div className="analytics-heatmap-wrap">
                    <DistrictCategoryHeatmap
                        tickets={periodSummary}
                        onSelect={canDrill ? openTickets : undefined}
                    />
                </div>
            )}
        </div>
    )
}

export default Analytics