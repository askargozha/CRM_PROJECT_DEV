import {
    useEffect,
    useState
} from "react"

import {
    useNavigate,
    useParams
} from "react-router-dom"

import { useTickets } from "../context/TicketContext"
import { useAuth } from "../context/AuthContext"
import { getUsers } from "../api/userApi"
import { getTicketComments, addTicketComment, sendTelegramReply } from "../api/ticketApi"
import { getEmailOperators } from "../api/emailOperatorsApi"

import { API_URL } from "../api/config"

import StatusBadge from "../components/StatusBadge"
import CreateTicketModal from "../components/CreateTicketModal"
import { useLanguage } from "../context/LanguageContext"
import { translatePriority } from "../i18n/helpers"

const CITIZEN_ROLE_NAME = "Пользователь"
const SPECIALIST_ROLE_NAME = "Специалист"

function TicketDetails() {

    const { id } = useParams()
    const navigate = useNavigate()
    const { user: currentUser } = useAuth()
    const { t, language } = useLanguage()
    const isCitizen = currentUser?.role_name === CITIZEN_ROLE_NAME

    const {
        tickets,
        updateTicket,
        deleteTicket,
        changeTicketStatus,
        assignTicketUser,
        reanalyzeTicketAi,
        resendTicketEmail
    } = useTickets()

    const [showModal, setShowModal] = useState(false)
    const [users, setUsers] = useState([])
    const [selectedUserId, setSelectedUserId] = useState("")
    const [usersLoading, setUsersLoading] = useState(true)
    const [assignmentSaving, setAssignmentSaving] = useState(false)
    const [assignmentMessage, setAssignmentMessage] = useState("")
    const [reanalyzing, setReanalyzing] = useState(false)
    const [resendingEmail, setResendingEmail] = useState(false)
    const [sendingManualEmail, setSendingManualEmail] = useState(false)
    const [emailOperators, setEmailOperators] = useState([])
    const [selectedOperatorId, setSelectedOperatorId] = useState("")
    const [manualEmail, setManualEmail] = useState("")

    const [telegramReplyText, setTelegramReplyText] = useState("")
    const [telegramReplyPhoto, setTelegramReplyPhoto] = useState(null)
    const [showTelegramReplyForm, setShowTelegramReplyForm] = useState(false)
    const [showEmailForm, setShowEmailForm] = useState(false)
    const [sendingTelegramReply, setSendingTelegramReply] = useState(false)
    const [telegramReplyMessage, setTelegramReplyMessage] = useState("")
    const [telegramReplyError, setTelegramReplyError] = useState("")

    const [comments, setComments] = useState([])
    const [commentsLoading, setCommentsLoading] = useState(true)
    const [newComment, setNewComment] = useState("")
    const [commentError, setCommentError] = useState("")
    const [postingComment, setPostingComment] = useState(false)

    const [openPhoto, setOpenPhoto] = useState(null)

    const ticketId = Number(id)
    const ticket = tickets.find(item => item.id === ticketId)

    useEffect(() => {
        if (!ticket || isCitizen) return
        if (ticket.status === "Новое") {
            changeTicketStatus(ticket.id, "В работе")
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ticket?.id, ticket?.status, isCitizen])

    useEffect(() => {
        if (isCitizen) {
            setUsersLoading(false)
            return
        }
        async function loadUsers() {
            try {
                setUsersLoading(true)
                const response = await getUsers()
                const activeUsers = response.data.filter(user => user.is_active !== false)
                setUsers(activeUsers)
            } catch (error) {
                console.error("Ошибка загрузки пользователей:", error)
                setAssignmentMessage(error.message || t("details_error_load_users"))
            } finally {
                setUsersLoading(false)
            }
        }
        loadUsers()
    }, [])

    useEffect(() => {
        if (!ticket) return
        setSelectedUserId(ticket.assigned_user_id ? String(ticket.assigned_user_id) : "")
    }, [ticket?.id, ticket?.assigned_user_id])

    useEffect(() => {
        if (!ticket) return
        let cancelled = false
        async function loadComments() {
            try {
                setCommentsLoading(true)
                const response = await getTicketComments(ticket.id)
                if (!cancelled) setComments(response.data)
            } catch (error) {
                console.error("Ошибка загрузки комментариев:", error)
            } finally {
                if (!cancelled) setCommentsLoading(false)
            }
        }
        loadComments()
        return () => { cancelled = true }
    }, [ticket?.id])

    useEffect(() => {
        if (isCitizen) return
        getEmailOperators()
            .then((response) => setEmailOperators(response.data))
            .catch((error) => console.error("Ошибка загрузки операторов рассылки:", error))
    }, [isCitizen])

    if (!ticket) {
        return (
            <div className="ticket-details">
                <h2>{t("details_not_found_title")}</h2>
                <button className="back-btn" onClick={() => navigate("/tickets")}>
                    ← {t("details_back_to_tickets")}
                </button>
            </div>
        )
    }

    const canEditOrDelete = !isCitizen && (
        currentUser?.role_name !== SPECIALIST_ROLE_NAME ||
        ticket.created_by_user_id === currentUser?.id
    )

    const canAssignUser = !isCitizen && currentUser?.role_name !== SPECIALIST_ROLE_NAME

    async function handleStatusChange(event) {
        try {
            await changeTicketStatus(ticket.id, event.target.value)
        } catch (error) {
            window.alert(error.message || t("details_error_status"))
        }
    }

    async function handleAssignUser() {
        try {
            setAssignmentSaving(true)
            setAssignmentMessage("")
            const userId = selectedUserId ? Number(selectedUserId) : null
            await assignTicketUser(ticket.id, userId)
            setAssignmentMessage(userId ? t("details_assignee_set") : t("details_assignee_removed"))
        } catch (error) {
            setAssignmentMessage(error.message || t("details_error_assign"))
        } finally {
            setAssignmentSaving(false)
        }
    }

    async function handleDeleteTicket() {
        const confirmed = window.confirm(t("details_confirm_delete").replace("{id}", ticket.id))
        if (!confirmed) return
        try {
            await deleteTicket(ticket.id)
            navigate("/tickets")
        } catch (error) {
            window.alert(error.message || t("details_error_delete"))
        }
    }

    async function handleReanalyze() {
        try {
            setReanalyzing(true)
            await reanalyzeTicketAi(ticket.id)
        } catch (error) {
            window.alert(error.message || t("details_error_reanalyze"))
        } finally {
            setReanalyzing(false)
        }
    }

    async function handleResendEmail() {
        try {
            setResendingEmail(true)
            await resendTicketEmail(ticket.id, selectedOperatorId ? Number(selectedOperatorId) : null, null)
        } catch (error) {
            window.alert(error.message || t("details_error_send_email"))
        } finally {
            setResendingEmail(false)
        }
    }

    async function handleSendManualEmail() {
        if (!manualEmail.trim()) return
        try {
            setSendingManualEmail(true)
            await resendTicketEmail(ticket.id, null, manualEmail.trim())
        } catch (error) {
            window.alert(error.message || t("details_error_send_email"))
        } finally {
            setSendingManualEmail(false)
        }
    }

    async function handleSendTelegramReply() {
        if (!telegramReplyText.trim() && !telegramReplyPhoto) {
            setTelegramReplyError(t("details_telegram_reply_empty"))
            return
        }
        try {
            setSendingTelegramReply(true)
            setTelegramReplyError("")
            setTelegramReplyMessage("")
            await sendTelegramReply(ticket.id, telegramReplyText.trim(), telegramReplyPhoto)
            setTelegramReplyText("")
            setTelegramReplyPhoto(null)
            setTelegramReplyMessage(t("details_telegram_reply_sent"))
        } catch (error) {
            setTelegramReplyError(error.message || t("details_telegram_reply_error"))
        } finally {
            setSendingTelegramReply(false)
        }
    }

    async function handleAddComment() {
        if (!newComment.trim()) {
            setCommentError(t("details_error_empty_comment"))
            return
        }
        try {
            setPostingComment(true)
            setCommentError("")
            const response = await addTicketComment(ticket.id, newComment.trim())
            setComments((prev) => [...prev, response.data])
            setNewComment("")
        } catch (error) {
            setCommentError(error.message || t("details_error_comment"))
        } finally {
            setPostingComment(false)
        }
    }

    return (
        <>
            <div className="ticket-details">
                <div className="details-top">
                    <button className="back-btn" onClick={() => navigate("/tickets")}>
                        ← {t("details_back")}
                    </button>
                    <h2>{t("details_ticket_number")} №{ticket.id}</h2>
                    {canEditOrDelete && (
                        <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                            <button className="edit-btn" onClick={() => setShowModal(true)}>
                                Изменить
                            </button>
                            <button className="delete-btn" onClick={handleDeleteTicket}>
                                Удалить
                            </button>
                        </div>
                    )}
                </div>

                {/* Жёлтый баннер с предупреждением об отправке оператору */}
                {!ticket.email_sent && (
                    <div style={{
                        backgroundColor: "#FFFBEB",
                        borderLeft: "4px solid #F59E0B",
                        padding: "14px 18px",
                        borderRadius: "0 8px 8px 0",
                        marginBottom: "20px",
                        display: "flex",
                        alignItems: "center",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                    }}>
                        <span style={{ fontSize: "20px", marginRight: "12px" }}>⚠️</span>
                        <div>
                            <strong style={{ color: "#92400E", fontSize: "14px", display: "block" }}>
                                Не отправлено оператору
                            </strong>
                            <span style={{ color: "#B45309", fontSize: "13.5px" }}>
                                {ticket.email_error ? `Причина: ${ticket.email_error}` : "Причина: письмо оператору ещё не было отправлено"}
                            </span>
                        </div>
                    </div>
                )}

                <div className="detail-columns">
                    <div className="detail-card">
                        <div className="detail-row">
                            <span>{t("register_fullname_label")}</span>
                            <strong>{ticket.applicant || t("details_not_specified")}</strong>
                        </div>
                        <div className="detail-row">
                            <span>{t("table_col_phone")}</span>
                            <strong>{ticket.phone || t("filter_district_unknown")}</strong>
                        </div>
                        <div className="detail-row">
                            <span>{t("details_source")}</span>
                            <strong>{ticket.source || t("filter_district_unknown")}</strong>
                        </div>
                        <div className="detail-row">
                            <span>{t("table_col_district")}</span>
                            <strong>{ticket.district || t("filter_district_unknown")}</strong>
                        </div>
                        <div className="detail-row">
                            <span>{t("details_category")}</span>
                            <strong>{ticket.category || t("details_not_specified_f")}</strong>
                        </div>
                        <div className="detail-row">
                            <span>{t("table_col_operator")}</span>
                            <strong>{ticket.operator || t("filter_district_unknown")}</strong>
                        </div>
                        <div className="detail-row">
                            <span>{t("details_current_status")}</span>
                            <StatusBadge status={ticket.status} />
                        </div>

                        {!isCitizen && (
                            <div className="detail-row">
                                <span>{t("details_change_status")}</span>
                                <select className="status-select" value={ticket.status} onChange={handleStatusChange}>
                                    <option value="Новое">{t("status_new")}</option>
                                    <option value="В работе">{t("status_progress")}</option>
                                    <option value="Закрыто">{t("status_closed")}</option>
                                </select>
                            </div>
                        )}

                        {canAssignUser && (
                            <div className="detail-row">
                                <span>{t("details_assignee")}</span>
                                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                                    <select
                                        className="status-select"
                                        value={selectedUserId}
                                        onChange={(e) => { setSelectedUserId(e.target.value); setAssignmentMessage(""); }}
                                        disabled={usersLoading || assignmentSaving}
                                    >
                                        <option value="">{t("details_not_assigned")}</option>
                                        {users.map(user => (
                                            <option key={user.id} value={user.id}>
                                                {user.full_name || user.username}
                                            </option>
                                        ))}
                                    </select>
                                    <button className="edit-btn" onClick={handleAssignUser} disabled={usersLoading || assignmentSaving}>
                                        {assignmentSaving ? t("modal_saving") : t("modal_save")}
                                    </button>
                                </div>
                            </div>
                        )}

                        {canAssignUser && assignmentMessage && (
                            <div className="detail-row">
                                <span />
                                <strong>{assignmentMessage}</strong>
                            </div>
                        )}

                        <div className="detail-row">
                            <span>{t("details_assigned_staff")}</span>
                            <strong>{ticket.assigned_user?.full_name || ticket.assigned_user?.username || t("details_not_assigned")}</strong>
                        </div>
                        <div className="detail-row">
                            <span>{t("table_col_priority")}</span>
                            <strong>{ticket.priority ? translatePriority(ticket.priority, t) : t("filter_district_unknown")}</strong>
                        </div>
                        <div className="detail-row">
                            <span>{t("table_col_date")}</span>
                            <strong>{ticket.date || t("details_not_specified_f")}</strong>
                        </div>
                    </div>

                    <div className="detail-description detail-ai-column">
                        <h3>
                            🤖 {t("details_ai_analysis")}
                            {!isCitizen && (
                                <button className="edit-btn" style={{ marginLeft: 12 }} onClick={handleReanalyze} disabled={reanalyzing}>
                                    {reanalyzing ? t("details_analyzing") : t("details_reanalyze")}
                                </button>
                            )}
                        </h3>

                        {!ticket.ai_processed && (
                            <p>{ticket.ai_summary || t("details_ai_not_run")}</p>
                        )}

                        {ticket.ai_processed && (
                            <>
                                <div className="detail-row">
                                    <span>{t("details_ai_category")}</span>
                                    <strong>{ticket.ai_category || "—"}</strong>
                                </div>
                                <div className="detail-row">
                                    <span>{t("details_ai_operator")}</span>
                                    <strong>{ticket.ai_operator || "—"}</strong>
                                </div>
                                <div className="detail-row">
                                    <span>{t("details_ai_priority")}</span>
                                    <strong>{ticket.ai_priority ? translatePriority(ticket.ai_priority, t) : "—"}</strong>
                                </div>
                                <div className="detail-row">
                                    <span>{t("details_ai_confidence")}</span>
                                    <strong>{ticket.ai_confidence != null ? `${Math.round(ticket.ai_confidence * 100)}%` : "—"}</strong>
                                </div>

                                {(ticket.ai_contains_profanity || ticket.ai_is_meaningful === false) && (
                                    <p style={{ color: "#B4402F", fontWeight: 600 }}>
                                        ⚠️ {ticket.ai_contains_profanity ? t("details_ai_profanity") : t("details_ai_not_meaningful")}
                                        {ticket.ai_moderation_reason ? ` — ${ticket.ai_moderation_reason}` : ""}
                                    </p>
                                )}

                                <p>
                                    <strong>{t("details_ai_summary")}: </strong>
                                    {ticket.ai_summary || "—"}
                                </p>

                                {ticket.ai_draft_letter && (
                                    <>
                                        <p><strong>{t("details_ai_draft_letter")}:</strong></p>
                                        <textarea
                                            className="modal-textarea"
                                            style={{ width: "100%", minHeight: 160 }}
                                            readOnly
                                            value={ticket.ai_draft_letter}
                                        />
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className="detail-description">
                    <h3>{t("table_col_description")}</h3>
                    <p>{ticket.description || t("details_no_description")}</p>
                </div>

                {!isCitizen && (
                    <div className="detail-description">
                        <button type="button" className="collapsible-toggle" onClick={() => setShowEmailForm((v) => !v)}>
                            <h3 style={{ margin: 0 }}>
                                {t("details_email_notification")}
                                <span style={{ marginLeft: 10, fontSize: 12.5, fontWeight: 600, color: ticket.email_sent ? "#2E7D32" : "#B4402F" }}>
                                    {ticket.email_sent ? t("details_email_status_sent") : t("details_email_status_not_sent")}
                                </span>
                            </h3>
                            <span className="collapsible-arrow">{showEmailForm ? "▲" : "▼"}</span>
                        </button>

                        {showEmailForm && (
                            <div style={{ marginTop: 12 }}>
                                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
                                    <select
                                        className="modal-input"
                                        style={{ maxWidth: 280 }}
                                        value={selectedOperatorId}
                                        onChange={(e) => setSelectedOperatorId(e.target.value)}
                                    >
                                        <option value="">{t("details_email_auto")}</option>
                                        {emailOperators.map((op) => (
                                            <option key={op.id} value={op.id}>
                                                {op.full_name} — {op.email}
                                            </option>
                                        ))}
                                    </select>
                                    <button className="edit-btn" onClick={handleResendEmail} disabled={resendingEmail}>
                                        {resendingEmail ? t("details_email_sending") : ticket.email_sent ? t("details_email_resend") : t("details_email_send")}
                                    </button>
                                </div>

                                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
                                    <span style={{ color: "var(--ink-500)", fontSize: 13 }}>{t("details_email_or")}</span>
                                    <input
                                        type="email"
                                        className="modal-input"
                                        style={{ maxWidth: 240 }}
                                        placeholder={t("details_email_manual_placeholder")}
                                        value={manualEmail}
                                        onChange={(e) => setManualEmail(e.target.value)}
                                    />
                                    <button className="edit-btn" onClick={handleSendManualEmail} disabled={sendingManualEmail || !manualEmail.trim()}>
                                        {sendingManualEmail ? t("details_email_sending") : t("details_email_send_manual")}
                                    </button>
                                </div>

                                {ticket.email_sent ? (
                                    <p>✅ {t("details_email_sent_to")} <strong>{ticket.email_recipient}</strong></p>
                                ) : (
                                    <p>❌ {t("details_email_not_sent")} {ticket.email_error && <>: {ticket.email_error}</>}</p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {!isCitizen && ticket.telegram_chat_id && (
                    <div className="detail-description">
                        <button type="button" className="collapsible-toggle" onClick={() => setShowTelegramReplyForm((v) => !v)}>
                            <h3 style={{ margin: 0 }}>Telegram</h3>
                            <span className="collapsible-arrow">{showTelegramReplyForm ? "▲" : "▼"}</span>
                        </button>

                        {showTelegramReplyForm && (
                            <div style={{ marginTop: 12 }}>
                                <textarea
                                    className="modal-textarea"
                                    style={{ width: "100%", minHeight: 80, marginBottom: 10 }}
                                    placeholder="Ответ гражданину в Telegram..."
                                    value={telegramReplyText}
                                    onChange={(e) => setTelegramReplyText(e.target.value)}
                                />
                                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
                                    <input type="file" accept="image/*" onChange={(e) => setTelegramReplyPhoto(e.target.files[0] || null)} />
                                    <button className="edit-btn" onClick={handleSendTelegramReply} disabled={sendingTelegramReply}>
                                        {sendingTelegramReply ? "Отправка..." : "Отправить ответ"}
                                    </button>
                                </div>
                                {telegramReplyMessage && <p style={{ color: "#2E7D32", marginTop: 8 }}>{telegramReplyMessage}</p>}
                                {telegramReplyError && <p style={{ color: "#B4402F", marginTop: 8 }}>{telegramReplyError}</p>}
                            </div>
                        )}
                    </div>
                )}

                <div className="detail-description">
                    <h3>Комментарии ({comments.length})</h3>
                    {commentsLoading ? (
                        <p>Загрузка комментариев...</p>
                    ) : (
                        <div>
                            {comments.map((comment) => (
                                <div key={comment.id} style={{ marginBottom: 12, borderBottom: "1px solid #eee", paddingBottom: 8 }}>
                                    <strong>{comment.user?.full_name || comment.user?.username || "Пользователь"}</strong>
                                    <span style={{ fontSize: 12, color: "#888", marginLeft: 8 }}>{comment.created_at}</span>
                                    <p style={{ margin: "4px 0 0 0" }}>{comment.text}</p>
                                </div>
                            ))}

                            <div style={{ marginTop: 16 }}>
                                <textarea
                                    className="modal-textarea"
                                    style={{ width: "100%", minHeight: 60, marginBottom: 8 }}
                                    placeholder="Написать комментарий..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                />
                                <button className="edit-btn" onClick={handleAddComment} disabled={postingComment}>
                                    {postingComment ? "Отправка..." : "Добавить комментарий"}
                                </button>
                                {commentError && <p style={{ color: "#B4402F", marginTop: 8 }}>{commentError}</p>}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showModal && (
                <CreateTicketModal
                    ticket={ticket}
                    onClose={() => setShowModal(false)}
                    onSaved={(updated) => updateTicket(updated)}
                />
            )}

            {openPhoto && (
                <div className="photo-modal-overlay" onClick={() => setOpenPhoto(null)}>
                    <div className="photo-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="photo-modal-close" onClick={() => setOpenPhoto(null)}>✕</button>
                        <img src={openPhoto} alt="Увеличенный просмотр" className="photo-modal-img" />
                    </div>
                </div>
            )}
        </>
    )
}

export default TicketDetails