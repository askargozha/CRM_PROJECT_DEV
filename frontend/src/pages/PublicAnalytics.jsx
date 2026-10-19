import { useEffect } from "react"

import logo from "../assets/logo.jpg"
import { useLanguage } from "../context/LanguageContext"
import { API_URL } from "../api/config"

// Эта страница — теперь точная копия того, что видит сторонний
// партнёр через встраиваемый <script>: тот же самый widget.js,
// просто подключённый прямо здесь вместо чужого сайта. Раньше тут
// был свой набор React-компонентов (StatCard/CategoryChart/
// DistrictBarChart и т.д.) с отдельной логикой — теперь один
// источник правды для вёрстки и агрегации данных: backend/app/static/widget.js.
const WIDGET_SCRIPT_SRC = `${API_URL}/widget.js`

function PublicAnalytics() {

    const { t, language, toggleLanguage } = useLanguage()
    
    // Состояние тёмной темы
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem("theme") || "light"
    })

    const toggleTheme = () => {
        const newTheme = theme === "light" ? "dark" : "light"
        setTheme(newTheme)
        localStorage.setItem("theme", newTheme)
        document.documentElement.setAttribute("data-theme", newTheme)
    }

    useEffect(() => {

        function mount() {
            if (window.SmartAqmolaWidget) {
                window.SmartAqmolaWidget.reload()
                return
            }

            const alreadyLoading = document.querySelector(
                `script[src="${WIDGET_SCRIPT_SRC}"]`
            )

            if (alreadyLoading) {
                alreadyLoading.addEventListener("load", () => {
                    window.SmartAqmolaWidget && window.SmartAqmolaWidget.reload()
                })
                return
            }

            const script = document.createElement("script")
            script.src = WIDGET_SCRIPT_SRC
            script.async = true
            document.body.appendChild(script)
        }

        mount()

    }, [])

    // Синхронизация языка
    useEffect(() => {
        const container = document.getElementById("smart-aqmola-widget")
        if (container) {
            container.setAttribute("data-lang", language === "kz" ? "kz" : "ru")
        }
        window.SmartAqmolaWidget && window.SmartAqmolaWidget.reload()
    }, [language])

    // Синхронизация темы
    useEffect(() => {
        const container = document.getElementById("smart-aqmola-widget")
        if (container) {
            container.setAttribute("data-theme", theme)
        }
        window.SmartAqmolaWidget && window.SmartAqmolaWidget.reload()
    }, [theme])

    return (
        <div className="public-analytics-page">

            <header className="public-analytics-header">

                <div className="public-analytics-brand">
                    <img src={logo} alt="Smart Aqmola" />
                    <span>SMART AQMOLA — {t("public_analytics_title")}</span>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                    {/* Кнопка переключения темы */}
                    <button
                        type="button"
                        className="header-channel-btn"
                        onClick={toggleTheme}
                    >
                        <strong>{theme === "light" ? "🌙" : "☀️"}</strong>
                    </button>

                    {/* Кнопка языка */}
                    <button
                        type="button"
                        className="header-channel-btn"
                        onClick={toggleLanguage}
                    >
                        <strong>{language === "kz" ? "РУС" : "ҚАЗ"}</strong>
                    </button>
                </div>

            </header>

            <main className="public-analytics-content">
                <div
                    id="smart-aqmola-widget"
                    data-lang={language === "kz" ? "kz" : "ru"}
                    data-theme={theme}
                />
            </main>

        </div>
    )
}

export default PublicAnalytics