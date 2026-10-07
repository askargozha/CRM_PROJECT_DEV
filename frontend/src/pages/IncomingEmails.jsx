import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import {
    getIncomingEmails,
    fetchIncomingEmailsNow,
    markIncomingEmailRead
} from "../api/incomingEmailsApi"
import { useAuth } from "../context/AuthContext"
import { useLanguage } from "../context/LanguageContext"

function EmailViewModal({ email, onClose }) {

    const { t, language } = useLanguage()

    return (
        <div className="modal-overlay">
            <div className="modal">

                <div className="modal-header">
                    <h2>{email.subject || t("incoming_no_subject")}</h2>
                    <button className="close-btn" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className="modal-body">

                    <p style={{ color: "var(--ink-500)", fontSize: 13.5 }}>
                        {t("incoming_from")}: {email.from_address}
                        <br />
                        {t("incoming_received")}: {new Date(email.received_at).toLocaleString(language === "kz" ? "kk-KZ" : "ru-RU")}
                        {email.ticket_id && (
                            <>
                                <br />
                                {t("nav_tickets")}:{" "}
                                <Link to={`/tickets/${email.ticket_id}`}>
                                    №{email.ticket_id}
                                </Link>
                            </>
                        )}
                    </p>

                    <div
                        style={{
                            whiteSpace: "pre-wrap",
                            marginTop: 14,
                            lineHeight: 1.55
                        }}
                    >
                        {email.body || t("incoming_empty_body")}
                    </div>

                </div>
            </div>
        </div>
    )
}

function IncomingEmails() {

    const { user: currentUser } = useAuth()
    const { t, language } = useLanguage()

    const [emails, setEmails] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [checking, setChecking] = useState(false)
    const [checkMessage, setCheckMessage] = useState("")
    const [viewingEmail, setViewingEmail] = useState(null)

    async function loadData() {

        try {
            setLoading(true)
            setError("")

            const response = await getIncomingEmails()
            setEmails(response.data)

        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    async function handleCheckNow() {

        try {
            setChecking(true)
            setCheckMessage("")
            setError("")

            const response = await fetchIncomingEmailsNow()
            const { fetched, matched } = response.data

            setCheckMessage(
                fetched === 0
                    ? t("incoming_no_new")
                    : `${t("incoming_fetched")}: ${fetched} (${t("incoming_matched")}: ${matched})`
            )

            await loadData()

        } catch (err) {
            setError(
                err.response?.data?.detail || err.message
            )
        } finally {
            setChecking(false)
        }
    }

    async function handleOpen(email) {

        setViewingEmail(email)

        if (!email.is_read) {
            try {
                await markIncomingEmailRead(email.id)
                setEmails((prev) =>
                    prev.map((item) =>
                        item.id === email.id
                            ? { ...item, is_read: true }
                            : item
                    )
                )
            } catch {
                // не критично, если не получилось пометить прочитанным
            }
        }
    }

    if (
        currentUser?.role_name !== "Администратор"
        && currentUser?.role_name !== "Специалист"
    ) {
        return (
            <div className="page-message">
                <p>{t("incoming_admin_specialist_only")}</p>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="page-message">
                <div className="loader"></div>
                <p>{t("incoming_loading")}</p>
            </div>
        )
    }

    return (
        <div className="table-container">
            <h2>{t("nav_incoming_emails")}</h2>

            <p style={{ color: "var(--ink-500)", fontSize: 13.5, marginBottom: 16 }}>
                {t("incoming_description")}
            </p>

            {error && (
                <div className="inline-error" style={{ marginBottom: 14 }}>
                    {error}
                </div>
            )}

            {checkMessage && !error && (
                <p style={{ color: "var(--ink-700)", marginBottom: 14 }}>
                    {checkMessage}
                </p>
            )}

            <button
                className="create-btn"
                style={{ marginBottom: 20 }}
                onClick={handleCheckNow}
                disabled={checking}
            >
                {checking ? t("incoming_checking") : t("incoming_check_now")}
            </button>

            <table>
                <thead>
                    <tr>
                        <th></th>
                        <th>{t("incoming_col_from")}</th>
                        <th>{t("incoming_col_subject")}</th>
                        <th>{t("nav_tickets")}</th>
                        <th>{t("incoming_col_received")}</th>
                    </tr>
                </thead>
                <tbody>
                    {emails.length === 0 ? (
                        <tr>
                            <td colSpan="5" className="empty-table">
                                {t("incoming_empty")}
                            </td>
                        </tr>
                    ) : (
                        emails.map((email) => (
                            <tr
                                key={email.id}
                                className="clickable-row"
                                onClick={() => handleOpen(email)}
                                style={{
                                    fontWeight: email.is_read ? 400 : 700
                                }}
                            >
                                <td>{email.is_read ? "" : "🔵"}</td>
                                <td>{email.from_address}</td>
                                <td>{email.subject || t("incoming_no_subject")}</td>
                                <td>
                                    {email.ticket_id
                                        ? `№${email.ticket_id}`
                                        : "—"}
                                </td>
                                <td>
                                    {new Date(email.received_at)
                                        .toLocaleString(language === "kz" ? "kk-KZ" : "ru-RU")}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {viewingEmail && (
                <EmailViewModal
                    email={viewingEmail}
                    onClose={() => setViewingEmail(null)}
                />
            )}

        </div>
    )
}

export default IncomingEmails
