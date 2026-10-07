import { useMemo } from "react"

import { BarChartIcon } from "./icons"
import { useLanguage } from "../context/LanguageContext"
import { translateCategory } from "../i18n/helpers"

const BAR_COLORS = [
    "#F4B740",
    "#2E7FC1",
    "#4FC8E8",
    "#79B93C",
    "#E58F2A",
    "#1B3768",
    "#9B6FD6"
]

function CategoryChart({ tickets }) {

    const { t } = useLanguage()

    const data = useMemo(() => {

        const counts = {}

        tickets.forEach((ticket) => {

            const label =
                ticket.ai_category ||
                t("category_undetermined")

            counts[label] = (counts[label] || 0) + 1
        })

        return Object.entries(counts)
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 7)

    }, [tickets, t])

    const maxValue =
        Math.max(1, ...data.map((item) => item.value))

    if (data.length === 0) {
        return null
    }

    return (
        <div className="chart-card">

            <h3>
                <BarChartIcon className="chart-title-icon" /> {t("chart_category_title")}
            </h3>

            <div className="chart-bars">

                {data.map((item, index) => {

                    const widthPercent =
                        Math.max(
                            4,
                            Math.round((item.value / maxValue) * 100)
                        )

                    const color =
                        BAR_COLORS[index % BAR_COLORS.length]

                    return (
                        <div
                            className="chart-row"
                            key={item.label}
                        >
                            <span className="chart-label">
                                {translateCategory(item.label, t)}
                            </span>

                            <div className="chart-track">
                                <div
                                    className="chart-fill"
                                    style={{
                                        width: `${widthPercent}%`,
                                        background: color
                                    }}
                                />
                            </div>

                            <span className="chart-value">
                                {item.value}
                            </span>
                        </div>
                    )
                })}

            </div>

        </div>
    )
}

export default CategoryChart
