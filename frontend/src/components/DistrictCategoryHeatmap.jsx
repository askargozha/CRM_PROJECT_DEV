import { useMemo } from "react"

import { useLanguage } from "../context/LanguageContext"
import { translateCategory, translateDistrict } from "../i18n/helpers"

// Тепловая таблица «район × категория»: чем темнее ячейка, тем больше обращений
// Клик по ячейке, названию района или категории вызывает onSelect({ district, category }) 
// Без onSelect таблица просто показывает данные.

const MAX_DISTRICTS = 8
const MAX_CATEGORIES = 7

function DistrictCategoryHeatmap({ tickets, onSelect }) {

    const { t, language } = useLanguage()

    const unknownDistrict = t("filter_district_unknown")

    const { districts, categories, cells, maxCount } = useMemo(() => {

        const cells = {}
        const districtTotals = {}
        const categoryTotals = {}

        tickets.forEach((ticket) => {

            const district = ticket.district || unknownDistrict
            const category = ticket.ai_category || unknownCategory
            if (!category) {
                return
            }
            const key = `${district}||${category}`

            cells[key] = (cells[key] || 0) + 1
            districtTotals[district] = (districtTotals[district] || 0) + 1
            categoryTotals[category] = (categoryTotals[category] || 0) + 1
        })

        const districts = Object.keys(districtTotals)
            .sort((a, b) => districtTotals[b] - districtTotals[a])
            .slice(0, MAX_DISTRICTS)

        const categories = Object.keys(categoryTotals)
            .sort((a, b) => categoryTotals[b] - categoryTotals[a])
            .slice(0, MAX_CATEGORIES)

        let maxCount = 0

        districts.forEach((district) => {
            categories.forEach((category) => {
                maxCount = Math.max(
                    maxCount,
                    cells[`${district}||${category}`] || 0
                )
            })
        })

        return { districts, categories, cells, maxCount }

    }, [tickets, unknownDistrict])

    return (
        <div className="chart-card heatmap-card">

            <h3>{t("analytics_heatmap_title")}</h3>

            {districts.length === 0 ? (
                <p className="chart-empty">{t("chart_no_data")}</p>
            ) : (
                <div className="heat-table-scroll">
                    <table className="heat-table">

                        <thead>
                            <tr>
                                <th></th>
                                {categories.map((category) => (
                                    <th key={category}>
                                        {onSelect ? (
                                            <button
                                                type="button"
                                                className="heat-head-btn"
                                                onClick={() => onSelect({ category })}
                                            >
                                                {translateCategory(category, t)}
                                            </button>
                                        ) : (
                                            translateCategory(category, t)
                                        )}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {districts.map((district) => (
                                <tr key={district}>

                                    <th className="heat-row-head">
                                        {onSelect ? (
                                            <button
                                                type="button"
                                                className="heat-head-btn"
                                                onClick={() => onSelect({ district })}
                                            >
                                                {translateDistrict(district, language, t)}
                                            </button>
                                        ) : (
                                            translateDistrict(district, language, t)
                                        )}
                                    </th>

                                    {categories.map((category) => {

                                        const count = cells[`${district}||${category}`] || 0
                                        const ratio = maxCount ? count / maxCount : 0

                                        if (count === 0) {
                                            return (
                                                <td key={category} className="heat-cell heat-cell-empty">
                                                    –
                                                </td>
                                            )
                                        }

                                        const style = {
                                            background: `rgba(46, 127, 193, ${0.15 + 0.75 * ratio})`,
                                            color: ratio > 0.5 ? "#FFFFFF" : "#12233F"
                                        }

                                        return (
                                            <td
                                                key={category}
                                                className={
                                                    onSelect
                                                        ? "heat-cell heat-cell-click"
                                                        : "heat-cell"
                                                }
                                                style={style}
                                                onClick={
                                                    onSelect
                                                        ? () => onSelect({ district, category })
                                                        : undefined
                                                }
                                            >
                                                {count}
                                            </td>
                                        )
                                    })}

                                </tr>
                            ))}
                        </tbody>

                    </table>
                </div>
            )}

        </div>
    )
}

export default DistrictCategoryHeatmap