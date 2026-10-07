import { useEffect, useMemo, useState } from "react"

import {
    getEmailOperators,
    createEmailOperator,
    updateEmailOperator,
    deleteEmailOperator
} from "../api/emailOperatorsApi"
import { useAuth } from "../context/AuthContext"
import { useTickets } from "../context/TicketContext"
import { useLanguage } from "../context/LanguageContext"

// Подсказки в поле ввода (совпадают со списком OPERATORS в
// backend/app/services/ai_service.py, чтобы автоматическая
// маршрутизация по названию срабатывала из коробки) — но поле
// свободное, можно вписать и любую другую компанию.
const OPERATOR_NAMES = [
    "Kcell",
    "Beeline",
    "Tele2",
    "Казахтелеком",
    "Другое / не указан"
]

function OperatorModal({ operator, onClose, onSaved, takenNames }) {

    const { t } = useLanguage()

    const [fullName, setFullName] = useState(
        operator?.full_name || ""
    )
    const [email, setEmail] = useState(operator?.email || "")
    const [secondaryEmail, setSecondaryEmail] = useState(
        operator?.secondary_email || ""
    )
    const [tertiaryEmail, setTertiaryEmail] = useState(
        operator?.tertiary_email || ""
    )
    const [isActive, setIsActive] = useState(
        operator ? operator.is_active : true
    )
    const [error, setError] = useState("")
    const [saving, setSaving] = useState(false)

    const suggestedNames = useMemo(() => {

        const taken = new Set(
            takenNames
                .filter((name) => name !== operator?.full_name)
        )

        return OPERATOR_NAMES.filter((name) => !taken.has(name))

    }, [takenNames, operator])

    async function handleSave() {

        if (!fullName || !email.trim()) {
            setError(t("emailops_error_required"))
            return
        }

        try {
            setSaving(true)
            setError("")

            const payload = {
                full_name: fullName,
                email,
                secondary_email: secondaryEmail.trim() || null,
                tertiary_email: tertiaryEmail.trim() || null,
                is_active: isActive
            }

            if (operator) {
                await updateEmailOperator(operator.id, payload)
            } else {
                await createEmailOperator(payload)
            }

            onSaved()
            onClose()

        } catch (err) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="modal-overlay">
            <div className="modal">

                <div className="modal-header">
                    <h2>
                        {operator ? t("emailops_edit_title") : t("emailops_new_title")}
                    </h2>
                    <button className="close-btn" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className="modal-body">

                    {error && (
                        <p style={{ color: "#dc2626", marginBottom: 10 }}>
                            {error}
                        </p>
                    )}

                    <label>{t("emailops_operator_label")}</label>
                    <input
                        className="modal-input"
                        list="operator-name-suggestions"
                        placeholder={t("emailops_operator_placeholder")}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                    />
                    <datalist id="operator-name-suggestions">
                        {suggestedNames.map((name) => (
                            <option key={name} value={name} />
                        ))}
                    </datalist>

                    <label>{t("emailops_email_label")}</label>
                    <input
                        className="modal-input"
                        type="email"
                        placeholder="operator@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    <label>{t("emailops_secondary_email_label")}</label>
                    <input
                        className="modal-input"
                        type="email"
                        placeholder="operator2@example.com"
                        value={secondaryEmail}
                        onChange={(e) => setSecondaryEmail(e.target.value)}
                    />

                    <label>{t("emailops_tertiary_email_label")}</label>
                    <input
                        className="modal-input"
                        type="email"
                        placeholder="boss@example.com"
                        value={tertiaryEmail}
                        onChange={(e) => setTertiaryEmail(e.target.value)}
                    />

                    <label>
                        <input
                            type="checkbox"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            style={{ marginRight: 8 }}
                        />
                        {t("emailops_active_checkbox")}
                    </label>

                    <div className="modal-buttons">
                        <button className="cancel-btn" onClick={onClose}>
                            {t("modal_cancel")}
                        </button>
                        <button
                            className="create-btn"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? t("modal_saving") : t("modal_save")}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    )
}

function OperatorTicketsModal({ operator, tickets, onClose }) {

    const { t } = useLanguage()

    return (
        <div className="modal-overlay">
            <div className="modal">

                <div className="modal-header">
                    <h2>{t("nav_tickets")} — {operator.full_name}</h2>
                    <button className="close-btn" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className="modal-body">

                    {tickets.length === 0 ? (
                        <p>{t("emailops_no_tickets_yet")}</p>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>№</th>
                                    <th>{t("table_col_applicant")}</th>
                                    <th>{t("table_col_category_ai")}</th>
                                    <th>{t("table_col_status")}</th>
                                    <th>{t("table_col_date")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tickets.map((ticket) => (
                                    <tr key={ticket.id}>
                                        <td>{ticket.id}</td>
                                        <td>{ticket.applicant}</td>
                                        <td>{ticket.ai_category || "—"}</td>
                                        <td>{ticket.status}</td>
                                        <td>{ticket.date}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                </div>
            </div>
        </div>
    )
}

function EmailOperators() {

    const { user: currentUser } = useAuth()
    const { tickets } = useTickets()
    const { t } = useLanguage()

    const [operators, setOperators] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [modalOperator, setModalOperator] = useState(undefined)
    const [viewingOperator, setViewingOperator] = useState(null)

    async function loadData() {

        try {
            setLoading(true)
            setError("")

            const response = await getEmailOperators()
            setOperators(response.data)

        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const ticketsByOperator = useMemo(() => {

        const map = {}

        tickets.forEach((ticket) => {

            if (!ticket.email_operator_id) {
                return
            }

            if (!map[ticket.email_operator_id]) {
                map[ticket.email_operator_id] = []
            }

            map[ticket.email_operator_id].push(ticket)
        })

        return map

    }, [tickets])

    async function handleDelete(id) {

        if (!window.confirm(t("emailops_confirm_delete"))) {
            return
        }

        try {
            await deleteEmailOperator(id)
            loadData()
        } catch (err) {
            alert(err.message)
        }
    }

    if (currentUser?.role_name !== "Администратор") {
        return (
            <div className="page-message">
                <p>{t("usermgmt_admin_only")}</p>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="page-message">
                <div className="loader"></div>
                <p>{t("emailops_loading")}</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="page-message">
                <p>{error}</p>
                <button className="retry-btn" onClick={loadData}>
                    {t("tickets_retry")}
                </button>
            </div>
        )
    }

    return (
        <div className="table-container">
            <h2>{t("nav_email_operators")}</h2>

            <p style={{ color: "var(--ink-500)", fontSize: 13.5, marginBottom: 16 }}>
                {t("emailops_description")}
            </p>

            <button
                className="create-btn"
                style={{ marginBottom: 20 }}
                onClick={() => setModalOperator(null)}
            >
                + {t("emailops_add_button")}
            </button>

            <table>
                <thead>
                    <tr>
                        <th>{t("emailops_operator_label")}</th>
                        <th>Email</th>
                        <th>{t("usermgmt_status")}</th>
                        <th>{t("emailops_sent_count")}</th>
                        <th>{t("usermgmt_actions")}</th>
                    </tr>
                </thead>
                <tbody>
                    {operators.length === 0 ? (
                        <tr>
                            <td colSpan="5" className="empty-table">
                                {t("emailops_empty")}
                            </td>
                        </tr>
                    ) : (
                        operators.map((op) => {

                            const opTickets =
                                ticketsByOperator[op.id] || []

                            return (
                                <tr
                                    key={op.id}
                                    className="clickable-row"
                                    onClick={() => setViewingOperator(op)}
                                >
                                    <td>{op.full_name}</td>
                                    <td>
                                        {op.email}
                                        {op.secondary_email && (
                                            <>
                                                <br />
                                                {op.secondary_email}
                                            </>
                                        )}
                                        {op.tertiary_email && (
                                            <>
                                                <br />
                                                {op.tertiary_email}
                                            </>
                                        )}
                                    </td>
                                    <td>
                                        <span
                                            className="status"
                                            style={{
                                                background: op.is_active
                                                    ? "#16a34a"
                                                    : "#9ca3af"
                                            }}
                                        >
                                            {op.is_active ? t("usermgmt_active") : t("usermgmt_disabled")}
                                        </span>
                                    </td>
                                    <td>{opTickets.length}</td>
                                    <td onClick={(e) => e.stopPropagation()}>
                                        <button
                                            className="create-btn"
                                            style={{ marginRight: 8 }}
                                            onClick={() => setModalOperator(op)}
                                        >
                                            {t("usermgmt_change")}
                                        </button>
                                        <button
                                            className="cancel-btn"
                                            onClick={() => handleDelete(op.id)}
                                        >
                                            {t("details_delete")}
                                        </button>
                                    </td>
                                </tr>
                            )
                        })
                    )}
                </tbody>
            </table>

            {modalOperator !== undefined && (
                <OperatorModal
                    operator={modalOperator}
                    onClose={() => setModalOperator(undefined)}
                    onSaved={loadData}
                    takenNames={operators.map((op) => op.full_name)}
                />
            )}

            {viewingOperator && (
                <OperatorTicketsModal
                    operator={viewingOperator}
                    tickets={ticketsByOperator[viewingOperator.id] || []}
                    onClose={() => setViewingOperator(null)}
                />
            )}

        </div>
    )
}

export default EmailOperators
