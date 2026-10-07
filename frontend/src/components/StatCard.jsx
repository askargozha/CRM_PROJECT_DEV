function StatCard({ title, value, icon, variant }) {

    const className =
        variant
            ? `card card-${variant}`
            : "card"

    return (
        <div className={className}>
            <h3>
                {icon && <span className="card-icon">{icon}</span>}
                {title}
            </h3>
            <h1>{value}</h1>
        </div>
    )
}


export default StatCard
