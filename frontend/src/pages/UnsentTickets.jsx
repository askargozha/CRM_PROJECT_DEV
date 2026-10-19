import { useEffect, useState, useCallback } from "react"
import TicketTable from "../components/TicketTable"
import { getUnsentTickets } from "../api/ticketApi"

export default function UnsentTickets() {
    const [tickets, setTickets] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    const loadTickets = useCallback(async () => {
        try {
            const res = await getUnsentTickets()
            setTickets(res.data || res || [])
        } catch (err) {
            setError(err.message || "Ошибка загрузки")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadTickets()
    }, [loadTickets])

    if (loading) return <div className="page-loading">Загрузка неотправленных обращений...</div>
    if (error) return <div className="error-message">Ошибка: {error}</div>

    return (
        <div className="tickets-page">
            <TicketTable 
                tickets={tickets} 
                title="Неотправленные обращения" 
                isUnsentView={true} 
                onRefresh={loadTickets}
            />
        </div>
    )
}