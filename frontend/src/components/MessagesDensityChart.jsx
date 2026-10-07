import { useMemo, useState } from "react"

import { TrendingUpIcon } from "./icons"
import { useLanguage } from "../context/LanguageContext"

const CHART_WIDTH = 760
const CHART_HEIGHT = 220
const PADDING_LEFT = 34
const PADDING_RIGHT = 16
const PADDING_TOP = 18
const PADDING_BOTTOM = 30

function formatDayLabel(dateStr) {

    const parts = dateStr.split("-")
    const month = parts[1]
    const day = parts[2]

    return `${day}.${month}`
}

function buildDateRange(tickets) {

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const earliestFromTickets = tickets.reduce((min, ticket) => {

        if (!ticket.created_date) {
            return min
        }

        const ticketDate = new Date(ticket.created_date)

        return (!min || ticketDate < min) ? ticketDate : min

    }, null)

    const fourteenDaysAgo = new Date(today)
    fourteenDaysAgo.setDate(today.getDate() - 13)

    const startDate =
        earliestFromTickets && earliestFromTickets < fourteenDaysAgo
            ? earliestFromTickets
            : fourteenDaysAgo

    const days = []
    const cursor = new Date(startDate)

    while (cursor <= today) {

        const iso = cursor.toISOString().slice(0, 10)
        days.push(iso)
        cursor.setDate(cursor.getDate() + 1)
    }

    return days
}

function MessagesDensityChart({ tickets, compact }) {

    const { t } = useLanguage()
    const [hoverIndex, setHoverIndex] = useState(null)

    const { days, counts, maxValue, points, areaPath, linePath } =
        useMemo(() => {

            const dateRange = buildDateRange(tickets)

            const countByDate = {}

            tickets.forEach((ticket) => {

                if (!ticket.created_date) {
                    return
                }

                countByDate[ticket.created_date] =
                    (countByDate[ticket.created_date] || 0) + 1
            })

            const countsList = dateRange.map(
                (day) => countByDate[day] || 0
            )

            const max = Math.max(1, ...countsList)

            const innerWidth =
                CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT

            const innerHeight =
                CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM

            const stepX =
                dateRange.length > 1
                    ? innerWidth / (dateRange.length - 1)
                    : 0

            const pointsList = countsList.map((value, index) => {

                const x = PADDING_LEFT + stepX * index

                const y =
                    PADDING_TOP +
                    innerHeight -
                    (value / max) * innerHeight

                return { x, y, value, day: dateRange[index] }
            })

            const linePathString = pointsList
                .map((point, index) =>
                    `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`
                )
                .join(" ")

            const baseline = PADDING_TOP + innerHeight

            const areaPathString =
                pointsList.length > 0
                    ? `${linePathString} ` +
                      `L ${pointsList[pointsList.length - 1].x.toFixed(1)} ${baseline} ` +
                      `L ${pointsList[0].x.toFixed(1)} ${baseline} Z`
                    : ""

            return {
                days: dateRange,
                counts: countsList,
                maxValue: max,
                points: pointsList,
                areaPath: areaPathString,
                linePath: linePathString
            }

        }, [tickets])

    const totalInRange = counts.reduce((sum, value) => sum + value, 0)

    const labelEvery =
        days.length > 10 ? Math.ceil(days.length / 7) : 1

    const gridLines = [0, 0.25, 0.5, 0.75, 1]

    const innerHeight =
        CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM

    return (
        <div className={compact ? "chart-card chart-card-compact" : "chart-card"}>

            <div className="chart-card-header">

                <h3>
                    <TrendingUpIcon className="chart-title-icon" /> {t("chart_density_title")}
                </h3>

                <span className="chart-total">
                    {totalInRange} {t("chart_period")}
                </span>

            </div>

            <svg
                viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                className="density-chart-svg"
                preserveAspectRatio="none"
            >

                <defs>
                    <linearGradient
                        id="densityFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                    >
                        <stop offset="0%" stopColor="#4FC8E8" stopOpacity="0.55" />
                        <stop offset="55%" stopColor="#2E7FC1" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#2E7FC1" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient
                        id="densityLine"
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="0"
                    >
                        <stop offset="0%" stopColor="#F4B740" />
                        <stop offset="45%" stopColor="#2E7FC1" />
                        <stop offset="100%" stopColor="#1B3768" />
                    </linearGradient>
                </defs>

                {gridLines.map((fraction) => {

                    const y =
                        PADDING_TOP + innerHeight * fraction

                    const label =
                        Math.round(maxValue * (1 - fraction))

                    return (
                        <g key={fraction}>
                            <line
                                x1={PADDING_LEFT}
                                x2={CHART_WIDTH - PADDING_RIGHT}
                                y1={y}
                                y2={y}
                                className="density-grid-line"
                            />
                            <text
                                x={PADDING_LEFT - 8}
                                y={y + 3}
                                className="density-axis-label"
                                textAnchor="end"
                            >
                                {label}
                            </text>
                        </g>
                    )
                })}

                {areaPath && (
                    <path
                        d={areaPath}
                        fill="url(#densityFill)"
                    />
                )}

                {linePath && (
                    <path
                        d={linePath}
                        fill="none"
                        stroke="url(#densityLine)"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                )}

                {points.map((point, index) => (
                    <g key={point.day}>

                        <circle
                            cx={point.x}
                            cy={point.y}
                            r={hoverIndex === index ? 5.5 : 2.5}
                            className="density-dot"
                            onMouseEnter={() => setHoverIndex(index)}
                            onMouseLeave={() => setHoverIndex(null)}
                        />

                        {index % labelEvery === 0 && (
                            <text
                                x={point.x}
                                y={CHART_HEIGHT - 8}
                                className="density-axis-label"
                                textAnchor="middle"
                            >
                                {formatDayLabel(point.day)}
                            </text>
                        )}

                        {hoverIndex === index && (
                            <g>
                                <rect
                                    x={point.x - 26}
                                    y={point.y - 32}
                                    width="52"
                                    height="22"
                                    rx="6"
                                    className="density-tooltip-bg"
                                />
                                <text
                                    x={point.x}
                                    y={point.y - 17}
                                    textAnchor="middle"
                                    className="density-tooltip-text"
                                >
                                    {point.value}
                                </text>
                            </g>
                        )}

                    </g>
                ))}

            </svg>

        </div>
    )
}

export default MessagesDensityChart
