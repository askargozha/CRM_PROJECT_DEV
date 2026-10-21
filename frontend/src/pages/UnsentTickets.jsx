import { useEffect, useState } from "react"
import TicketTable from "../components/TicketTable"
import ErrorState from "../components/ErrorState"
import { getUnsentTickets } from "../api/ticketApi"
import { useLanguage } from "../context/LanguageContext"

export default function UnsentTickets() {
    const [tickets, setTickets] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [attempt, setAttempt] = useState(0)
    const { t } = useLanguage()

    useEffect(() => {
        let cancelled = false
        getUnsentTickets()
            .then((res) => {
                if (!cancelled) setTickets(res.data || res || [])
            })
            .catch((err) => {
                if (!cancelled) setError(err.message || "Ошибка загрузки")
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => { cancelled = true }
    }, [attempt])

    function retry() {
        setError("")
        setLoading(true)
        setAttempt((previous) => previous + 1)
    }

    if (loading) return <div className="page-loading">Загрузка неотправленных обращений...</div>
    if (error) return (
        <ErrorState
            title={t("tickets_load_error_title")}
            message={error}
            retryLabel={t("tickets_retry")}
            onRetry={retry}
        />
    )

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
