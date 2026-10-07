import { useEffect, useMemo, useState } from "react"

import StatCard from "../components/StatCard"
import CategoryChart from "../components/CategoryChart"
import MessagesDensityChart from "../components/MessagesDensityChart"
import DistrictBarChart from "../components/DistrictBarChart"
import DistrictPieChart from "../components/DistrictPieChart"
import { AlertIcon, CheckIcon, DotIcon, InboxIcon } from "../components/icons"
import { useAuth } from "../context/AuthContext"
import { useLanguage } from "../context/LanguageContext"
import { getTicketsAnalyticsSummary, downloadTicketsReport } from "../api/ticketApi"

const CITIZEN_ROLE_NAME = "Пользователь"

function toDateInputValue(date) {
    return date.toISOString().slice(0, 10)
}

function Analytics() {

    const { user } = useAuth()
    const { t } = useLanguage()

    const isCitizen = user?.role_name === CITIZEN_ROLE_NAME

    // Общая аналитика — по ВСЕМ обращениям (без персональных данных),
    // доступна и роли "Пользователь", а не только сотрудникам.
    const [summary, setSummary] = useState([])
    const [summaryLoading, setSummaryLoading] = useState(true)

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

    const stats = useMemo(() => {

        const total = summary.length

        const newCount = summary.filter(
            item => item.status === "Новое"
        ).length

        const inProgress = summary.filter(
            item => item.status === "В работе"
        ).length

        const closed = summary.filter(
            item => item.status === "Закрыто"
        ).length

        const result = [
            {
                key: "total",
                title: t("analytics_stat_total"),
                value: total,
                icon: <InboxIcon className="card-icon-svg" />,
                variant: "total"
            },
            {
                key: "new",
                title: t("analytics_stat_new"),
                value: newCount,
                icon: <DotIcon className="card-icon-svg icon-new" />,
                variant: "new"
            },
            {
                key: "progress",
                title: t("analytics_stat_progress"),
                value: inProgress,
                icon: <DotIcon className="card-icon-svg icon-progress" />,
                variant: "progress"
            },
            {
                key: "closed",
                title: t("analytics_stat_closed"),
                value: closed,
                icon: <DotIcon className="card-icon-svg icon-closed" />,
                variant: "closed"
            }
        ]

        // Статус отправки письма оператору — внутренняя, рабочая
        // информация, жителям её не показываем.
        if (!isCitizen) {

            const sentCount = summary.filter(
                item => item.email_sent
            ).length

            result.push(
                {
                    key: "sent",
                    title: t("analytics_stat_sent"),
                    value: sentCount,
                    icon: <CheckIcon className="card-icon-svg icon-closed" />,
                    variant: "closed"
                },
                {
                    key: "not-sent",
                    title: t("analytics_stat_not_sent"),
                    value: total - sentCount,
                    icon: <AlertIcon className="card-icon-svg icon-new" />,
                    variant: "new"
                }
            )
        }

        return result

    }, [summary, t, isCitizen])

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

            <div className="cards">
                {stats.map((item) => (
                    <StatCard
                        key={item.key}
                        title={item.title}
                        value={item.value}
                        icon={item.icon}
                        variant={item.variant}
                    />
                ))}
            </div>

            <div className="analytics-top-grid">

                <div className="analytics-left-column">

                    {!summaryLoading && (
                        <>
                            <DistrictPieChart tickets={summary} />
                            <MessagesDensityChart tickets={summary} compact />
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
                            <DistrictBarChart tickets={summary} />
                            <CategoryChart tickets={summary} />
                        </>
                    )}

                </div>
            </div>

        </div>
    )
}

export default Analytics
