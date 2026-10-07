import { useMemo } from "react"

import { MapPinIcon } from "./icons"
import { useLanguage } from "../context/LanguageContext"
import { translateDistrict } from "../i18n/helpers"

const BAR_COLORS = [
    "#2E7FC1",
    "#F4B740",
    "#79B93C",
    "#4FC8E8",
    "#E58F2A",
    "#9B6FD6",
    "#1B3768"
]

function DistrictBarChart({ tickets }) {

    const { t, language } = useLanguage()

    const data = useMemo(() => {

        const counts = {}

        tickets.forEach((ticket) => {

            const label = ticket.district || t("filter_district_unknown")
            counts[label] = (counts[label] || 0) + 1
        })

        return Object.entries(counts)
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6)

    }, [tickets, t])

    const maxValue =
        Math.max(1, ...data.map((item) => item.value))

    return (
        <div className="chart-card chart-card-compact">

            <h3><MapPinIcon className="chart-title-icon" /> {t("chart_district_bar_title")}</h3>

            {data.length === 0 ? (
                <p className="chart-empty">{t("chart_no_data")}</p>
            ) : (
                <div className="chart-bars chart-bars-compact">

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
                                    {translateDistrict(item.label, language, t)}
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
            )}

        </div>
    )
}

export default DistrictBarChart
