import { Navigate } from "react-router-dom"

import { useAuth } from "../context/AuthContext"

function ProtectedRoute({ children }) {

    const { user, loading } = useAuth()

    if (loading) {
        return (
            <div className="page-message">
                <div className="loader"></div>
                <p>Проверка авторизации...</p>
            </div>
        )
    }

    if (!user) {
        return (
            <Navigate
                to="/login"
                replace
            />
        )
    }

    return children
}

export default ProtectedRoute