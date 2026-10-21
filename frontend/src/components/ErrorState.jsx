export default function ErrorState({ title, message, retryLabel, onRetry }) {
    return (
        <div className="page-message error-state" role="alert">
            <h2 className="error-title">{title}</h2>
            <p className="error-description">{message}</p>
            <button type="button" className="error-retry-btn" onClick={onRetry}>
                {retryLabel}
            </button>
        </div>
    )
}
