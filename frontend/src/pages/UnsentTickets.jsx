import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getUnsentTickets } from "../api/ticketApi"

// Функция для сопоставления ошибки с понятным типом по ТЗ
const getReadableError = (error) => {
    if (!error) return "Другое"
    
    const err = error.toLowerCase()

    if (err.includes("ai") || err.includes("ии") || err.includes("openai") || err.includes("model")) {
        return "ИИ не сработал"
    }
    if (err.includes("profanity") || err.includes("мат") || err.includes("модерац") || err.includes("бессодержательн") || err.includes("спам")) {
        return "Модерация"
    }
    if (err.includes("limit") || err.includes("лимит") || err.includes("quota") || err.includes("exceeded")) {
        return "Лимит писем"
    }
    if (err.includes("operator") || err.includes("оператор") || err.includes("address") || err.includes("адрес") || err.includes("recipient")) {
        return "Нет оператора или адреса"
    }
    if (err.includes("smtp") || err.includes("mail") || err.includes("почт") || err.includes("send") || err.includes("connection")) {
        return "Ошибка почты"
    }

    return "Другое"
}

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
                                <td style={{ color: "#d32f2f", fontWeight: "500" }}>
                                    {getReadableError(ticket.email_error)}
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