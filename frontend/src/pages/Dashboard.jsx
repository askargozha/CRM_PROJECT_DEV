import { useMemo } from "react"

import { useTickets } from "../context/TicketContext"
import CoverageMap from "../components/CoverageMap"
import TicketTable from "../components/TicketTable"

function Dashboard() {

    const { tickets, loading } = useTickets()

    const recentTickets = useMemo(
        () => tickets.slice(-6).reverse(),
        [tickets]
    )

    return (
        <div className="welcome-screen">

            <div className="dashboard-top-grid">

                <div className="dashboard-recent-compact">
                    {!loading && (
                        <TicketTable
                            tickets={recentTickets}
                            hideColumns={["phone", "priority"]}
                        />
                    )}
                </div>

                <div className="dashboard-map-compact">
                    <CoverageMap tickets={tickets} />
                </div>

            </div>

        </div>
    )
}

export default Dashboard
