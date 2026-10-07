import { useMemo } from "react"

import { PieChartIcon } from "./icons"
import { useLanguage } from "../context/LanguageContext"
import { translateDistrict } from "../i18n/helpers"

const SLICE_COLORS = [
    "#2E7FC1",
    "#F4B740",
    "#79B93C",
    "#4FC8E8",
    "#E58F2A",
    "#9B6FD6",
    "#8FA1BB"
]

function DistrictPieChart({ tickets }) {

    const { t, language } = useLanguage()

    const { slices, total, gradient } = useMemo(() => {

        const counts = {}

        tickets.forEach((ticket) => {

            const label = ticket.district || t("filter_district_unknown")
            counts[label] = (counts[label] || 0) + 1
        })

        const sorted = Object.entries(counts)
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => b.value - a.value)

        const topSlices = sorted.slice(0, 5)
        const otherCount = sorted
            .slice(5)
            .reduce((sum, item) => sum + item.value, 0)

        if (otherCount > 0) {
            topSlices.push({ label: t("chart_other_districts"), value: otherCount })
        }

        const totalCount =
            topSlices.reduce((sum, item) => sum + item.value, 0) || 1

        const slicesWithColor = topSlices.reduce((accumulator, item, index) => {

            const previous = accumulator[index - 1]
            const start = previous ? previous.start + previous.percent : 0
            const percent = (item.value / totalCount) * 100
            const color = SLICE_COLORS[index % SLICE_COLORS.length]

            accumulator.push({
                ...item,
                percent,
                color,
                start
            })

            return accumulator

        }, [])

        const gradientString = slicesWithColor
            .map((slice) =>
                `${slice.color} ${slice.start}% ${slice.start + slice.percent}%`
            )
            .join(", ")

        return {
            slices: slicesWithColor,
            total: totalCount,
            gradient: gradientString
        }

    }, [tickets, t])

    return (
        <div className="chart-card chart-card-compact">

            <h3><PieChartIcon className="chart-title-icon" /> {t("chart_district_pie_title")}</h3>

            {slices.length === 0 ? (
                <p className="chart-empty">{t("chart_no_data")}</p>
            ) : (
                <div className="pie-chart-body">

                    <div
                        className="pie-chart-circle"
                        style={{
                            background: `conic-gradient(${gradient})`
                        }}
                    >
                        <div className="pie-chart-hole">
                            <strong>{total}</strong>
                            <span>{t("chart_total")}</span>
                        </div>
                    </div>

                    <div className="pie-chart-legend">
                        {slices.map((slice) => (
                            <div
                                className="pie-legend-row"
                                key={slice.label}
                            >
                                <span
                                    className="pie-legend-dot"
                                    style={{ background: slice.color }}
                                />
                                <span className="pie-legend-label">
                                    {slice.label === t("chart_other_districts")
                                        ? slice.label
                                        : translateDistrict(slice.label, language, t)}
                                </span>
                                <span className="pie-legend-value">
                                    {Math.round(slice.percent)}%
                                </span>
                            </div>
                        ))}
                    </div>

                </div>
            )}

        </div>
    )
}

export default DistrictPieChart
