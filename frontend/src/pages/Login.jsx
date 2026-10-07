import { useEffect, useState } from "react"
import {
    Link,
    Navigate,
    useNavigate
} from "react-router-dom"

import { login } from "../api/authApi"
import { useAuth } from "../context/AuthContext"
import { useLanguage } from "../context/LanguageContext"
import logo from "../assets/logo.jpg"

function Login() {

    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [submitting, setSubmitting] = useState(false)

    const navigate = useNavigate()
    const { t, language, setLanguage } = useLanguage()

    const {
        user,
        loading,
        loadCurrentUser
    } = useAuth()

    useEffect(() => {
        setError("")
    }, [username, password])

    async function handleLogin(event) {

        event.preventDefault()

        try {

            setSubmitting(true)
            setError("")

            const data = await login(
                username.trim().toLowerCase(),
                password
            )

            localStorage.setItem(
                "token",
                data.access_token
            )

            await loadCurrentUser()

            navigate("/", {
                replace: true
            })

        } catch (loginError) {

            localStorage.removeItem("token")

            setError(
                loginError.message ||
                t("login_error_default")
            )

        } finally {

            setSubmitting(false)

        }
    }

    if (loading) {
        return (
            <div className="login-page">
                <div className="loader"></div>
            </div>
        )
    }

    if (user) {
        return (
            <Navigate
                to="/"
                replace
            />
        )
    }

    return (
        <div className="login-page">

            <div className="login-corner tl" />
            <div className="login-corner tr" />
            <div className="login-corner bl" />
            <div className="login-corner br" />

            <div className="lang-switcher login-lang-switcher">
                <button
                    className={language === "ru" ? "lang-btn active" : "lang-btn"}
                    onClick={() => setLanguage("ru")}
                    type="button"
                >
                    РУС
                </button>
                <button
                    className={language === "kz" ? "lang-btn active" : "lang-btn"}
                    onClick={() => setLanguage("kz")}
                    type="button"
                >
                    ҚАЗ
                </button>
            </div>

            <form
                className="login-card"
                onSubmit={handleLogin}
            >

                <img
                    src={logo}
                    alt="Smart Aqmola"
                    className="login-logo-badge"
                />

                <span className="login-brand-tag">
                    SMART AQMOLA
                </span>

                <h1>{t("login_title")}</h1>

                <p className="login-subtitle">
                    {t("login_subtitle")}
                </p>

                {error && (
                    <div className="login-error">
                        {error}
                    </div>
                )}

                <label>
                    {t("login_username_label")}
                </label>

                <input
                    value={username}
                    onChange={(event) =>
                        setUsername(event.target.value)
                    }
                    placeholder={t("login_username_placeholder")}
                    autoComplete="username"
                    required
                />

                <label>
                    {t("login_password_label")}
                </label>

                <input
                    type="password"
                    value={password}
                    onChange={(event) =>
                        setPassword(event.target.value)
                    }
                    placeholder={t("login_password_placeholder")}
                    autoComplete="current-password"
                    required
                />

                <button
                    type="submit"
                    disabled={submitting}
                >
                    {submitting
                        ? t("login_submitting")
                        : t("login_submit")
                    }
                </button>

                <p className="login-subtitle">
                    {t("login_no_account")}{" "}
                    <Link to="/register">
                        {t("login_register_link")}
                    </Link>
                </p>

            </form>

        </div>
    )
}

export default Login
