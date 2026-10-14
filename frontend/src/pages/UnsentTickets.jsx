import { useEffect, useState } from "react"
import TicketTable from "../components/TicketTable"
import { getUnsentTickets } from "../api/ticketApi"

export default function UnsentTickets() {
    const [tickets, setTickets] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        getUnsentTickets()
            .then((res) => setTickets(res.data || res || []))
            .catch((err) => setError(err.message || "Ошибка загрузки"))
            .finally(() => setLoading(false))
    }, [])

    if (loading) return <div className="page-loading">Загрузка неотправленных обращений...</div>
    if (error) return <div className="error-message">Ошибка: {error}</div>

    return (
        <div className="tickets-page">
            <TicketTable 
                tickets={tickets} 
                title="Неотправленные обращения" 
                isUnsentView={true} 
            />
        </div>
    )
}