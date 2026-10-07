import "./App.css"

import { useEffect, useState } from "react"

import {
    BrowserRouter,
    Link,
    Navigate,
    Route,
    Routes,
    useLocation,
    useNavigate
} from "react-router-dom"

import logo from "./assets/logo.jpg"

import Dashboard from "./pages/Dashboard"
import Tickets from "./pages/Tickets"
import Users from "./pages/Users"
import Staff from "./pages/Staff"
import EmailOperators from "./pages/EmailOperators"
import IncomingEmails from "./pages/IncomingEmails"
import Analytics from "./pages/Analytics"
import Cybersecurity from "./pages/Cybersecurity"
import NationalProjects from "./pages/NationalProjects"

import TicketDetails from "./pages/TicketDetails"
import Login from "./pages/Login"
import Register from "./pages/Register"

import ProtectedRoute from "./components/ProtectedRoute"
import AituForm from "./pages/AituForm"
import PublicAnalytics from "./pages/PublicAnalytics"
import { useAuth } from "./context/AuthContext"
import { useLanguage } from "./context/LanguageContext"

// Обычный житель (бывшая роль "Наблюдатель") видит только свои
// обращения и не должен видеть служебные разделы CRM.
const CITIZEN_ROLE_NAME = "Пользователь"


function NavLink({ to, children }) {

    const location = useLocation()

    const isActive =
        to === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(to)

    return (
        <li>
            <Link
                to={to}
                className={isActive ? "active" : ""}
            >
                {children}
            </Link>
        </li>
    )
}


function getGreeting(hour, t) {

    if (hour < 6) return t("greeting_night")
    if (hour < 12) return t("greeting_morning")
    if (hour < 18) return t("greeting_day")

    return t("greeting_evening")
}


function LanguageSwitcher() {

    const { language, setLanguage } = useLanguage()

    return (
        <div className="lang-switcher">
            <button
                className={language === "ru" ? "lang-btn active" : "lang-btn"}
                onClick={() => setLanguage("ru")}
            >
                РУС
            </button>
            <button
                className={language === "kz" ? "lang-btn active" : "lang-btn"}
                onClick={() => setLanguage("kz")}
            >
                ҚАЗ
            </button>
        </div>
    )
}


function CRMLayout() {

    const {
        user,
        logout
    } = useAuth()

    const navigate = useNavigate()
    const { t, language } = useLanguage()

    const isCitizen = user.role_name === CITIZEN_ROLE_NAME

    const [now, setNow] = useState(new Date())

    useEffect(() => {

        const timer = setInterval(
            () => setNow(new Date()),
            1000
        )

        return () => clearInterval(timer)

    }, [])

    const locale = language === "kz" ? "kk-KZ" : "ru-RU"

    const dateLabel = now.toLocaleDateString(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    })

    const timeLabel = now.toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    })

    const firstName =
        user?.full_name?.split(" ")[0] || t("dashboard_colleague")

    const CHANNELS = [
        { labelKey: "channel_web_label", noteKey: "channel_web_note", action: "create" },
        {
            labelKey: "channel_telegram_label",
            noteKey: "channel_bot_note",
            action: "telegram",
            url: "https://web.telegram.org/k/#@Smart_Aqmola_hotbot"
        },
    ]

    function handleChannelClick(channel) {

        if (channel.action === "create") {
            navigate(
                "/tickets",
                {
                    state: { openCreate: true }
                }
            )
        } else if (channel.action === "telegram" && channel.url) {
            window.open(channel.url, "_blank", "noopener,noreferrer")
        }
    }

    function handleLogout() {

        logout()

        navigate(
            "/login",
            {
                replace: true
            }
        )
    }

    return (
        <div className="app">

            <header className="header">

                <div className="header-greeting">

                    <h1>
                        {getGreeting(now.getHours(), t)}, {firstName}
                    </h1>

                    <div className="header-clock">
                        <span className="header-clock-time">{timeLabel}</span>
                        <span className="header-clock-date">{dateLabel}</span>
                    </div>

                </div>

                <div className="header-channels">
                    {CHANNELS.map((channel) => (
                        <button
                            key={channel.labelKey}
                            className="header-channel-btn"
                            type="button"
                            onClick={() => handleChannelClick(channel)}
                        >
                            <strong>{t(channel.labelKey)}</strong>
                            <span>{t(channel.noteKey)}</span>
                        </button>
                    ))}
                </div>

                <div className="user-panel">

                    <LanguageSwitcher />

                    <div className="user-info">

                        <strong>
                            {user.full_name}
                        </strong>

                        <span>
                            {user.role_name}
                        </span>

                    </div>

                    <button
                        className="logout-btn"
                        onClick={handleLogout}
                    >
                        {t("nav_logout")}
                    </button>

                </div>

            </header>

            <main className="main">

                <aside className="sidebar">

                    <div className="brand">

                        <img
                            src={logo}
                            alt="Smart Aqmola"
                            className="brand-logo"
                        />

                        <div className="brand-text">
                            <span className="brand-name">SMART AQMOLA</span>
                            <span className="brand-tag">{t("brand_tag")}</span>
                        </div>

                    </div>

                    <ul>

                        <NavLink to="/">
                            {t("nav_home")}
                        </NavLink>

                        <NavLink to="/tickets">
                            {isCitizen ? t("nav_my_tickets") : t("nav_tickets")}
                        </NavLink>

                        {user.role_name === "Администратор" && (
                            <NavLink to="/users">
                                {t("nav_users")}
                            </NavLink>
                        )}

                        {user.role_name === "Администратор" && (
                            <NavLink to="/staff">
                                {t("nav_staff")}
                            </NavLink>
                        )}

                        {user.role_name === "Администратор" && (
                            <NavLink to="/email-operators">
                                {t("nav_email_operators")}
                            </NavLink>
                        )}

                        {["Администратор", "Специалист"].includes(user.role_name) && (
                            <NavLink to="/incoming-emails">
                                {t("nav_incoming_emails")}
                            </NavLink>
                        )}

                        {["Администратор", "Специалист"].includes(user.role_name) && (
                            <NavLink to="/analytics">
                                {t("nav_analytics")}
                            </NavLink>
                        )}

                        <NavLink to="/cybersecurity">
                            {t("footer_cybersecurity")}
                        </NavLink>

                        <li>
                            <a
                                href="https://adilet.zan.kz/rus/docs/K2600000255"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {t("footer_digital_code")}
                            </a>
                        </li>

                    </ul>

                </aside>

                <section className="content">

                    <Routes>

                        <Route
                            path="/"
                            element={<Dashboard />}
                        />

                        <Route
                            path="/tickets"
                            element={<Tickets />}
                        />

                        <Route
                            path="/tickets/:id"
                            element={<TicketDetails />}
                        />

                        <Route
                            path="/users"
                            element={
                                user.role_name === "Администратор"
                                    ? <Users />
                                    : <Navigate to="/" replace />
                            }
                        />

                        <Route
                            path="/staff"
                            element={
                                user.role_name === "Администратор"
                                    ? <Staff />
                                    : <Navigate to="/" replace />
                            }
                        />

                        <Route
                            path="/email-operators"
                            element={
                                user.role_name === "Администратор"
                                    ? <EmailOperators />
                                    : <Navigate to="/" replace />
                            }
                        />

                        <Route
                            path="/incoming-emails"
                            element={
                                ["Администратор", "Специалист"].includes(user.role_name)
                                    ? <IncomingEmails />
                                    : <Navigate to="/" replace />
                            }
                        />

                        <Route
                            path="/analytics"
                            element={
                                ["Администратор", "Специалист"].includes(user.role_name)
                                    ? <Analytics />
                                    : <Navigate to="/" replace />
                            }
                        />

                        <Route
                            path="/cybersecurity"
                            element={<Cybersecurity />}
                        />

                        <Route
                            path="/national-projects"
                            element={<NationalProjects />}
                        />

                        <Route
                            path="*"
                            element={
                                <Navigate
                                    to="/"
                                    replace
                                />
                            }
                        />

                    </Routes>

                </section>

            </main>

            <footer className="footer">
                <div className="footer-content">

                    <span>
                        © {new Date().getFullYear()} {t("footer_copyright")}
                    </span>

                </div>
            </footer>

        </div>
    )
}


function App() {

    return (
        <BrowserRouter>

            <Routes>

                <Route
                    path="/login"
                    element={<Login />}
                />

                <Route
                    path="/register"
                    element={<Register />}
                />

                <Route
                    path="/aitu"
                    element={<AituForm />}
                />

                <Route
                    path="/public-analytics"
                    element={<PublicAnalytics />}
                />

                <Route
                    path="/*"
                    element={
                        <ProtectedRoute>

                            <CRMLayout />

                        </ProtectedRoute>
                    }
                />

            </Routes>

        </BrowserRouter>
    )
}

export default App
