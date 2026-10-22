function StatCard({ title, value, icon, variant, 
    change, goodWhen, vsText, noDataText }) {

    const className =
        variant
            ? `card card-${variant}`
            : "card"
    let changeBlock = null

    if (change) {

        if (change.percent === null) {

            changeBlock = (
                <div className="card-change card-change-neutral">
                    {noDataText}
                </div>
            )

        } else {

            const percent = change.percent
            const direction =
                percent > 0 ? "up" : percent < 0 ? "down" : "flat"

            let tone = "neutral"

            if (goodWhen && direction !== "flat") {
                tone = direction === goodWhen ? "good" : "bad"
            }

            const arrow =
                direction === "up" ? "▲" : direction === "down" ? "▼" : "•"

            const sign = percent > 0 ? "+" : ""

            changeBlock = (
                <div className={`card-change card-change-${tone}`}>
                    <span className="card-change-arrow">{arrow}</span>
                    <span className="card-change-value">
                        {sign}{percent}%
                    </span>
                    <span className="card-change-label">{vsText}</span>
                </div>
            )
        }
    }
    
    return (
        <div className={className}>
            <h3>
                {icon && <span className="card-icon">{icon}</span>}
                {title}
            </h3>
            <h1>{value}</h1>
            {changeBlock}
        </div>
    )
}


export default StatCard
