import { useMemo } from "react"

// Разрез обращений по одному признаку (оператор, район, источник):
// число обращений, доля и изменение к прошлому периоду по каждой строке.
//
//   tickets      — обращения за выбранный период
//   prevTickets  — обращения за прошлый период (null — без сравнения)
//   getLabel     — как достать значение признака из обращения
//   formatLabel  — как показать значение (например, перевод на казахский)

const BAR_COLORS = [
    "#2E7FC1",
    "#F4B740",
    "#79B93C",
    "#4FC8E8",
    "#E58F2A",
    "#9B6FD6",
    "#1B3768"
]

function countBy(items, getLabel) {

    const counts = {}

    items.forEach((ticket) => {
        const label = getLabel(ticket)
        counts[label] = (counts[label] || 0) + 1
    })

    return counts
}

function BreakdownCard({
    title,
    icon,
    tickets,
    prevTickets,
    getLabel,
    formatLabel,
    onRowClick,
    emptyText,
    noDataText,
    limit = 6
}) {

    const rows = useMemo(() => {

        const current = countBy(tickets, getLabel)
        const previous = prevTickets ? countBy(prevTickets, getLabel) : null

        return Object.entries(current)
            .map(([label, value]) => {

                let change

                if (!previous) {
                    change = undefined
                } else {

                    const prev = previous[label] || 0

                    // null — в прошлом периоде такой строки не было
                    change = prev === 0
                        ? null
                        : Math.round(((value - prev) / prev) * 1000) / 10
                }

                return { label, value, change }
            })
            .sort((a, b) => b.value - a.value)
            .slice(0, limit)

    }, [tickets, prevTickets, getLabel, limit])

    const maxValue = Math.max(1, ...rows.map((row) => row.value))
    const total = tickets.length

    return (
        <div className="chart-card chart-card-compact">

            <h3>{icon} {title}</h3>

            {rows.length === 0 ? (
                <p className="chart-empty">{emptyText}</p>
            ) : (
                <div className="chart-bars chart-bars-compact">

                    {rows.map((row, index) => {

                        const widthPercent = Math.max(
                            4,
                            Math.round((row.value / maxValue) * 100)
                        )

                        const share = Math.round((row.value / total) * 100)

                        let changeNode = <span className="breakdown-change" />

                        if (row.change === null) {

                            changeNode = (
                                <span
                                    className="breakdown-change card-change-neutral"
                                    title={noDataText}
                                >
                                    new
                                </span>
                            )

                        } else if (row.change !== undefined) {

                            const arrow =
                                row.change > 0 ? "▲" : row.change < 0 ? "▼" : "•"
                            const sign = row.change > 0 ? "+" : ""

                            changeNode = (
                                <span className="breakdown-change card-change-neutral">
                                    {arrow} {sign}{row.change}%
                                </span>
                            )
                        }

                        return (
                            <div className={onRowClick
                                        ? "chart-row breakdown-row breakdown-row-click"
                                        : "chart-row breakdown-row"
                                }
                                key={row.label}
                                role={onRowClick ? "button" : undefined}
                                tabIndex={onRowClick ? 0 : undefined}
                                onClick={
                                    onRowClick ? () => onRowClick(row.label) : undefined
                                }
                                onKeyDown={
                                    onRowClick
                                        ? (event) => {
                                            if (event.key === "Enter") {
                                                onRowClick(row.label)
                                            }
                                        }
                                        : undefined
                                }
                            >
                                <span className="chart-label">
                                    {formatLabel
                                        ? formatLabel(row.label)
                                        : row.label}
                                </span>

                                <div className="chart-track">
                                    <div
                                        className="chart-fill"
                                        style={{
                                            width: `${widthPercent}%`,
                                            background:
                                                BAR_COLORS[index % BAR_COLORS.length]
                                        }}
                                    />
                                </div>

                                <span className="chart-value">
                                    {row.value}
                                    <span className="breakdown-share"> · {share}%</span>
                                </span>

                                {changeNode}

                            </div>
                        )
                    })}

                </div>
            )}

        </div>
    )
}

export default BreakdownCard
