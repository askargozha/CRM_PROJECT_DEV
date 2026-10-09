import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getUnsentTickets } from "../api/ticketApi"

export default function UnsentTickets() {
    const [tickets, setTickets] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        getUnsentTickets()
            .then((res) => setTickets(res.data || []))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false))
    }, [])

    if (loading) return <div className="page-loading">Загрузка неотправленных обращений...</div>
    if (error) return <div className="error-message">Ошибка: {error}</div>

    return (
        <div className="tickets-page">
            <h2>Неотправленные обращения</h2>
            <p style={{ color: "#666", marginBottom: "20px" }}>
                Обращения, по которым письма не ушли автоматически из-за ошибок ИИ или лимитов.
            </p>

            {tickets.length === 0 ? (
                <div className="empty-state">Все обращения успешно отправлены!</div>
            ) : (
                <table className="crm-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Тема/Категория</th>
                            <th>Причина задержки</th>
                            <th>Действие</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tickets.map((ticket) => (
                            <tr key={ticket.id}>
                                <td>#{ticket.id}</td>
                                <td>{ticket.category || ticket.ai_category || "Без категории"}</td>
                                <td style={{ color: "#d32f2f" }}>
                                    {ticket.email_error || "Требуется проверка"}
                                </td>
                                <td>
                                    <Link to={`/tickets/${ticket.id}`} className="btn-secondary">
                                        Проверить и отправить
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    )
}