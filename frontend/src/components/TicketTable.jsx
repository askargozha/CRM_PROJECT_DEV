import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import StatusBadge from "./StatusBadge"
import { useLanguage } from "../context/LanguageContext"
import { translatePriority } from "../i18n/helpers"

function exportToExcel(tickets, filenamePrefix, t) {

    import("xlsx").then((XLSX) => {

        const rows = tickets.map((ticket) => ({
            [t("table_col_number")]: ticket.id,
            [t("table_col_applicant")]: ticket.applicant,
            [t("table_col_phone")]: ticket.phone || "",
            [t("table_col_district")]: ticket.district || t("filter_district_unknown"),
            [t("table_col_operator")]: ticket.operator || t("filter_operator_unknown"),
            [t("table_col_category_ai")]: ticket.ai_category || "",
            [t("table_col_status")]: ticket.status,
            [t("table_col_priority")]: ticket.priority,
            [t("table_col_date")]: ticket.date || ticket.created_date || "",
            [t("table_col_description")]: ticket.description || ""
        }))

        const worksheet = XLSX.utils.json_to_sheet(rows)
        const workbook = XLSX.utils.book_new()

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            t("nav_tickets")
        )

        const today = new Date()
            .toISOString()
            .slice(0, 10)

        XLSX.writeFile(
            workbook,
            `${filenamePrefix}_${today}.xlsx`
        )
    })
}

function TicketTable({ tickets, title, hideColumns = [] }) {

    const { t } = useLanguage()

    const hidePhone = hideColumns.includes("phone")
    const hidePriority = hideColumns.includes("priority")

    const [search, setSearch] = useState("")
    const [status, setStatus] = useState("Все")
    const [operator, setOperator] = useState("Все")
    const [district, setDistrict] = useState("Все")
    const [emailStatus, setEmailStatus] = useState("Все")
    const [dateFrom, setDateFrom] = useState("")
    const [dateTo, setDateTo] = useState("")

    const navigate = useNavigate()

    const operatorOptions = useMemo(() => {

        const unique = new Set()

        tickets.forEach((ticket) => {
            unique.add(ticket.operator || t("filter_operator_unknown"))
        })

        return Array.from(unique).sort()

    }, [tickets, t])

    const districtOptions = useMemo(() => {

        const unique = new Set()

        tickets.forEach((ticket) => {
            unique.add(ticket.district || t("filter_district_unknown"))
        })

        return Array.from(unique).sort()

    }, [tickets, t])

    const filteredTickets = tickets
        .filter(ticket =>
            ticket.applicant
                .toLowerCase()
                .includes(search.toLowerCase())
        )
        .filter(ticket =>
            status === "Все"
                ? true
                : ticket.status === status
        )
        .filter(ticket =>
            operator === "Все"
                ? true
                : (ticket.operator || t("filter_operator_unknown")) === operator
        )
        .filter(ticket =>
            district === "Все"
                ? true
                : (ticket.district || t("filter_district_unknown")) === district
        )
        .filter(ticket => {

            if (emailStatus === "Все") {
                return true
            }

            return emailStatus === "Отправлено"
                ? ticket.email_sent
                : !ticket.email_sent
        })
        .filter(ticket => {

            if (!dateFrom && !dateTo) {
                return true
            }

            const ticketDate = ticket.created_date

            if (!ticketDate) {
                return false
            }

            if (dateFrom && ticketDate < dateFrom) {
                return false
            }

            if (dateTo && ticketDate > dateTo) {
                return false
            }

            return true
        })

    function handleResetFilters() {
        setSearch("")
        setStatus("Все")
        setOperator("Все")
        setDistrict("Все")
        setEmailStatus("Все")
        setDateFrom("")
        setDateTo("")
    }

    const hasActiveFilters =
        search || status !== "Все" || operator !== "Все" || district !== "Все" ||
        emailStatus !== "Все" || dateFrom || dateTo

    return (
        <div className="table-container">

            <div className="table-header-row">

                <h2>{title || t("table_default_title")}</h2>

                <button
                    className="export-btn"
                    onClick={() =>
                        exportToExcel(filteredTickets, t("nav_tickets"), t)
                    }
                    disabled={filteredTickets.length === 0}
                    title={t("table_export_title")}
                >
                    {t("table_export_button")}
                </button>

            </div>

            <div className="table-controls">

                <input
                    type="text"
                    placeholder={t("table_search_placeholder")}
                    value={search}
                    onChange={(event) =>
                        setSearch(event.target.value)
                    }
                    className="search"
                />

                <select
                    value={status}
                    onChange={(event) =>
                        setStatus(event.target.value)
                    }
                    className="filter"
                >
                    <option value="Все">{t("filter_status_all")}</option>
                    <option value="Новое">{t("status_new")}</option>
                    <option value="В работе">{t("status_progress")}</option>
                    <option value="Закрыто">{t("status_closed")}</option>
                </select>

                <select
                    value={operator}
                    onChange={(event) =>
                        setOperator(event.target.value)
                    }
                    className="filter"
                >
                    <option value="Все">{t("filter_operator_all")}</option>
                    {operatorOptions.map((value) => (
                        <option key={value} value={value}>
                            {value}
                        </option>
                    ))}
                </select>

                <select
                    value={district}
                    onChange={(event) =>
                        setDistrict(event.target.value)
                    }
                    className="filter"
                >
                    <option value="Все">{t("filter_district_all")}</option>
                    {districtOptions.map((value) => (
                        <option key={value} value={value}>
                            {value}
                        </option>
                    ))}
                </select>

                <select
                    value={emailStatus}
                    onChange={(event) =>
                        setEmailStatus(event.target.value)
                    }
                    className="filter"
                >
                    <option value="Все">{t("filter_email_all")}</option>
                    <option value="Отправлено">{t("filter_email_sent")}</option>
                    <option value="Не отправлено">{t("filter_email_not_sent")}</option>
                </select>

                <label className="date-filter">
                    {t("filter_date_from")}
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(event) =>
                            setDateFrom(event.target.value)
                        }
                        className="filter"
                    />
                </label>

                <label className="date-filter">
                    {t("filter_date_to")}
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(event) =>
                            setDateTo(event.target.value)
                        }
                        className="filter"
                    />
                </label>

                {hasActiveFilters && (
                    <button
                        className="reset-filters-btn"
                        onClick={handleResetFilters}
                        type="button"
                    >
                        ✕ {t("filter_reset")}
                    </button>
                )}

            </div>

            <table>

                <thead>
                    <tr>
                        <th>№</th>
                        <th>{t("table_col_applicant")}</th>
                        {!hidePhone && <th>{t("table_col_phone")}</th>}
                        <th>{t("table_col_district")}</th>
                        <th>{t("table_col_operator")}</th>
                        <th>{t("table_col_status")}</th>
                        {!hidePriority && <th>{t("table_col_priority")}</th>}
                        <th>{t("table_col_date")}</th>
                    </tr>
                </thead>

                <tbody>

                    {filteredTickets.length > 0 ? (

                        filteredTickets.map(ticket => (

                            <tr
                                key={ticket.id}
                                onClick={() =>
                                    navigate(`/tickets/${ticket.id}`)
                                }
                                className="clickable-row"
                            >
                                <td>{ticket.id}</td>

                                <td>
                                    {ticket.applicant}
                                </td>

                                {!hidePhone && (
                                    <td>
                                        {ticket.phone || "—"}
                                    </td>
                                )}

                                <td>
                                    {ticket.district || "—"}
                                </td>

                                <td>
                                    {ticket.operator || t("filter_operator_unknown")}
                                </td>

                                <td>
                                    <StatusBadge
                                        status={ticket.status}
                                    />
                                </td>

                                {!hidePriority && (
                                    <td>
                                        {translatePriority(ticket.priority, t)}
                                    </td>
                                )}

                                <td>
                                    {ticket.date}
                                </td>

                            </tr>

                        ))

                    ) : (

                        <tr>
                            <td
                                colSpan={8 - hideColumns.length}
                                className="empty-table"
                            >
                                {tickets.length === 0
                                    ? t("table_empty_no_tickets")
                                    : t("table_empty_no_match")
                                }
                            </td>
                        </tr>

                    )}

                </tbody>

            </table>

        </div>
    )
}

export default TicketTable
