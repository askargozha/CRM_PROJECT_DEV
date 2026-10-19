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

import StatusBadge from "../components/StatusBadge"
import { useLanguage } from "../context/LanguageContext"
import { translatePriority } from "../i18n/helpers"

const CITIZEN_ROLE_NAME = "Пользователь"
const SPECIALIST_ROLE_NAME = "Специалист"

function TicketDetails() {

    const { id } = useParams()
    const navigate = useNavigate()
    const { user: currentUser } = useAuth()
    const { t } = useLanguage()
    const isCitizen = currentUser?.role_name === CITIZEN_ROLE_NAME

    const {
        tickets,
        changeTicketStatus,
        assignTicketUser,
        reanalyzeTicketAi,
        resendTicketEmail
    } = useTickets()

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

    const ticketId = Number(id)
    const ticket = tickets.find(item => item.id === ticketId)

    useEffect(() => {
        if (!ticket || isCitizen) {
            return
        }

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
    }, [isCitizen, t])

    useEffect(() => {
        if (!ticket) {
            return
        }

        setSelectedUserId(
            ticket.assigned_user_id ? String(ticket.assigned_user_id) : ""
        )
    }, [ticket?.id, ticket?.assigned_user_id])

    useEffect(() => {
        if (!ticket) {
            return
        }

        let cancelled = false

        async function loadComments() {
            try {
                setCommentsLoading(true)
                const response = await getTicketComments(ticket.id)
                if (!cancelled) {
                    setComments(response.data)
                }
            } catch (error) {
                console.error("Ошибка загрузки комментариев:", error)
            } finally {
                if (!cancelled) {
                    setCommentsLoading(false)
                }
            }
        }

        loadComments()

        return () => {
            cancelled = true
        }
    }, [ticket?.id])

    useEffect(() => {
        if (isCitizen) {
            return
        }

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

    const canAssignUser = !isCitizen && currentUser?.role_name !== SPECIALIST_ROLE_NAME

    async function handleStatusChange(event) {
        const newStatus = event.target.value
        try {
            await changeTicketStatus(ticket.id, newStatus)
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
            await resendTicketEmail(
                ticket.id,
                selectedOperatorId ? Number(selectedOperatorId) : null,
                null
            )
        } catch (error) {
            window.alert(error.message || t("details_error_send_email"))
        } finally {
            setResendingEmail(false)
        }
    }

    async function handleSendManualEmail() {
        if (!manualEmail.trim()) {
            return
        }

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
        <div className="ticket-details">
            <div className="details-top">
                <button className="back-btn" onClick={() => navigate("/tickets")}>
                    ← {t("details_back")}
                </button>
                <h2>{t("details_ticket_number")} №{ticket.id}</h2>
            </div>

            {/* Жёлтый баннер предупреждения */}
            {!ticket.email_sent && (
                <div className="unsent-warning-banner">
                    <span className="unsent-warning-icon">⚠️</span>
                    <div>
                        <strong className="unsent-warning-title">
                            Не отправлено оператору
                        </strong>
                        <span className="unsent-warning-text">
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
                            <select
                                className="status-select"
                                value={ticket.status}
                                onChange={handleStatusChange}
                            >
                                <option value="Новое">{t("status_new")}</option>
                                <option value="В работе">{t("status_progress")}</option>
                                <option value="Закрыто">{t("status_closed")}</option>
                            </select>
                        </div>
                    )}

                    {canAssignUser && (
                        <div className="detail-row">
                            <span>{t("details_assignee")}</span>
                            <div className="assignee-select-group">
                                <select
                                    className="status-select"
                                    value={selectedUserId}
                                    onChange={event => {
                                        setSelectedUserId(event.target.value)
                                        setAssignmentMessage("")
                                    }}
                                    disabled={usersLoading || assignmentSaving}
                                >
                                    <option value="">{t("details_not_assigned")}</option>
                                    {users.map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.full_name || user.username}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    className="edit-btn"
                                    onClick={handleAssignUser}
                                    disabled={usersLoading || assignmentSaving}
                                >
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
                        <strong>
                            {ticket.assigned_user?.full_name ||
                             ticket.assigned_user?.username ||
                             t("details_not_assigned")}
                        </strong>
                    </div>

                    <div className="detail-row">
                        <span>{t("table_col_priority")}</span>
                        <strong>
                            {ticket.priority ? translatePriority(ticket.priority, t) : t("filter_district_unknown")}
                        </strong>
                    </div>

                    <div className="detail-row">
                        <span>{t("table_col_date")}</span>
                        <strong>{ticket.date || t("details_not_specified_f")}</strong>
                    </div>
                </div>

                <div className="detail-description detail-ai-column">
                    <h3>
                        🤖 {t("details_ai_analysis")}
                        {/* Кнопка показывается ТОЛЬКО когда ai_processed === false */}
                        {!isCitizen && !ticket.ai_processed && (
                            <button
                                className="edit-btn reanalyze-ai-btn"
                                onClick={handleReanalyze}
                                disabled={reanalyzing}
                            >
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
                                <strong>
                                    {ticket.ai_priority ? translatePriority(ticket.ai_priority, t) : "—"}
                                </strong>
                            </div>

                            <div className="detail-row">
                                <span>{t("details_ai_confidence")}</span>
                                <strong>
                                    {ticket.ai_confidence != null ? `${Math.round(ticket.ai_confidence * 100)}%` : "—"}
                                </strong>
                            </div>

                            {(ticket.ai_contains_profanity || ticket.ai_is_meaningful === false) && (
                                <p className="ai-moderation-warning">
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
                                        className="modal-textarea ai-draft-textarea"
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
                    <button
                        type="button"
                        className="collapsible-toggle"
                        onClick={() => setShowEmailForm((value) => !value)}
                    >
                        <h3>
                            {t("details_email_notification")}
                            <span className={ticket.email_sent ? "email-status-sent" : "email-status-unsent"}>
                                {ticket.email_sent ? t("details_email_status_sent") : t("details_email_status_not_sent")}
                            </span>
                        </h3>
                        <span className="collapsible-arrow">{showEmailForm ? "▲" : "▼"}</span>
                    </button>

                    {showEmailForm && (
                        <div className="email-form-container">
                            <div className="email-form-row">
                                <select
                                    className="modal-input email-operator-select"
                                    value={selectedOperatorId}
                                    onChange={(event) => setSelectedOperatorId(event.target.value)}
                                >
                                    <option value="">{t("details_email_auto")}</option>
                                    {emailOperators.map((op) => (
                                        <option key={op.id} value={op.id}>
                                            {op.full_name} — {op.email}
                                        </option>
                                    ))}
                                </select>

                                <button
                                    className="edit-btn"
                                    onClick={handleResendEmail}
                                    disabled={resendingEmail}
                                >
                                    {resendingEmail ? t("details_email_sending") : ticket.email_sent ? t("details_email_resend") : t("details_email_send")}
                                </button>
                            </div>

                            <div className="email-form-row">
                                <span className="email-or-label">
                                    {t("details_email_or")}
                                </span>
                                <input
                                    type="email"
                                    className="modal-input email-manual-input"
                                    placeholder={t("details_email_manual_placeholder")}
                                    value={manualEmail}
                                    onChange={(event) => setManualEmail(event.target.value)}
                                />
                                <button
                                    className="edit-btn"
                                    onClick={handleSendManualEmail}
                                    disabled={sendingManualEmail || !manualEmail.trim()}
                                >
                                    {sendingManualEmail ? t("details_email_sending") : t("details_email_send_manual")}
                                </button>
                            </div>

                            {ticket.email_sent ? (
                                <p>
                                    ✅ {t("details_email_sent_to")} <strong>{ticket.email_recipient}</strong>
                                </p>
                            ) : (
                                <p>
                                    ❌ {t("details_email_not_sent")}
                                    {ticket.email_error && <>: {ticket.email_error}</>}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {!isCitizen && ticket.telegram_chat_id && (
                <div className="detail-description">
                    <button
                        type="button"
                        className="collapsible-toggle"
                        onClick={() => setShowTelegramReplyForm((value) => !value)}
                    >
                        <h3>Telegram</h3>
                        <span className="collapsible-arrow">{showTelegramReplyForm ? "▲" : "▼"}</span>
                    </button>

                    {showTelegramReplyForm && (
                        <div className="telegram-form-container">
                            <textarea
                                className="modal-textarea telegram-reply-textarea"
                                placeholder="Ответ гражданину в Telegram..."
                                value={telegramReplyText}
                                onChange={(e) => setTelegramReplyText(e.target.value)}
                            />

                            <div className="telegram-action-row">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setTelegramReplyPhoto(e.target.files[0] || null)}
                                />
                                <button
                                    className="edit-btn"
                                    onClick={handleSendTelegramReply}
                                    disabled={sendingTelegramReply}
                                >
                                    {sendingTelegramReply ? "Отправка..." : "Отправить ответ"}
                                </button>
                            </div>

                            {telegramReplyMessage && <p className="success-text">{telegramReplyMessage}</p>}
                            {telegramReplyError && <p className="error-text">{telegramReplyError}</p>}
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
                            <div key={comment.id} className="comment-item">
                                <strong>{comment.user?.full_name || comment.user?.username || "Пользователь"}</strong>
                                <span className="comment-date">{comment.created_at}</span>
                                <p>{comment.text}</p>
                            </div>
                        ))}

                        <div className="add-comment-section">
                            <textarea
                                className="modal-textarea new-comment-textarea"
                                placeholder="Написать комментарий..."
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                            />
                            <button className="edit-btn" onClick={handleAddComment} disabled={postingComment}>
                                {postingComment ? "Отправка..." : "Добавить комментарий"}
                            </button>
                            {commentError && <p className="error-text">{commentError}</p>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default TicketDetails