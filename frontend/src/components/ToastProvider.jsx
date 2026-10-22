import { useCallback, useEffect, useRef, useState } from "react"
import { ToastContext } from "../context/ToastContext"
import { useLanguage } from "../context/LanguageContext"
import "./Toast.css"

export default function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])
    const timers = useRef(new Map())
    const nextId = useRef(0)
    const { t } = useLanguage()

    const dismiss = useCallback((id) => {
        clearTimeout(timers.current.get(id))
        timers.current.delete(id)
        setToasts(current => current.filter(toast => toast.id !== id))
    }, [])

    const notify = useCallback((message) => {
        const id = ++nextId.current
        setToasts(current => [...current, { id, message }])
        timers.current.set(id, setTimeout(() => dismiss(id), 8000))
    }, [dismiss])

    useEffect(() => {
        const activeTimers = timers.current
        return () => {
            activeTimers.forEach(timer => clearTimeout(timer))
            activeTimers.clear()
        }
    }, [])

    return (
        <ToastContext.Provider value={notify}>
            {children}
            <div className="toast-container" aria-live="assertive" aria-atomic="false">
                {toasts.map(toast => (
                    <div className="toast-message" key={toast.id}>
                        <span>{toast.message}</span>
                        <button type="button" onClick={() => dismiss(toast.id)}
                            aria-label={t("toast_close")}>
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}
