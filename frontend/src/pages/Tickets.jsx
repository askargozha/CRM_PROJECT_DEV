import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"

import { useTickets } from "../context/TicketContext"
import { useAuth } from "../context/AuthContext"
import { useLanguage } from "../context/LanguageContext"
import TicketTable from "../components/TicketTable"
import CreateTicketModal from "../components/CreateTicketModal"

const CITIZEN_ROLE_NAME = "Пользователь"

function Tickets() {

    const {
        tickets,
        loading,
        error,
        loadTickets,
        addTicket
    } = useTickets()

    const { user } = useAuth()
    const { t } = useLanguage()
    const isCitizen = user?.role_name === CITIZEN_ROLE_NAME

    const location = useLocation()
    const navigate = useNavigate()
    const [showModal, setShowModal] = useState(false)

    useEffect(() => {
        if (location.state?.openCreate) {
            setShowModal(true)
            navigate(location.pathname, { replace: true, state: {} })
        }
    }, [location.state, location.pathname, navigate])

    if (loading) {
        return (
            <div className="page-message">
                <div className="loader"></div>

                <p>{t("tickets_loading")}</p>
            </div>
        )
    }

    if (error && tickets.length === 0) {
        return (
            <div className="page-message error-message">

                <h2>{t("tickets_load_error_title")}</h2>

                <p>{error}</p>

                <button
                    className="retry-btn"
                    onClick={loadTickets}
                >
                    {t("tickets_retry")}
                </button>

            </div>
        )
    }

    return (
        <div>

            <div className="tickets-header">

                <h2>{isCitizen ? t("nav_my_tickets") : t("nav_tickets")}</h2>

                <button
                    className="create-btn"
                    onClick={() => setShowModal(true)}
                >
                    + {isCitizen ? t("tickets_create_citizen") : t("tickets_create_staff")}
                </button>

            </div>

            {error && (
                <div className="inline-error">
                    {error}
                </div>
            )}

            <TicketTable
                tickets={tickets}
                title={isCitizen ? t("nav_my_tickets") : t("tickets_all_title")}
            />

            {showModal && (
                <CreateTicketModal
                    tickets={tickets}
                    onAdd={addTicket}
                    onClose={() => setShowModal(false)}
                />
            )}

        </div>
    )
}

export default Tickets
