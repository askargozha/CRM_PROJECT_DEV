import {
    createContext,
    useContext,
    useEffect,
    useState
} from "react"

import { getCurrentUser } from "../api/authApi"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {

    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    async function loadCurrentUser() {

        const token = localStorage.getItem("token")

        if (!token) {
            setUser(null)
            setLoading(false)
            return
        }

        try {

            const currentUser = await getCurrentUser()

            setUser(currentUser)

        } catch {

            localStorage.removeItem("token")
            setUser(null)

        } finally {

            setLoading(false)

        }
    }

    function logout() {
        localStorage.removeItem("token")
        setUser(null)
    }

    useEffect(() => {
        loadCurrentUser()
    }, [])

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                setUser,
                loadCurrentUser,
                logout
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}