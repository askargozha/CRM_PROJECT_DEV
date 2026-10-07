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

    // Синхронизация языка страницы с языком виджета: он сам не следит
    // за переключателем на сайте (см. обсуждение выше про data-lang +
    // reload()), поэтому обновляем атрибут вручную при каждом тогле.
    useEffect(() => {
        const container = document.getElementById("smart-aqmola-widget")
        if (container) {
            container.setAttribute("data-lang", language === "kz" ? "kz" : "ru")
        }
        window.SmartAqmolaWidget && window.SmartAqmolaWidget.reload()
    }, [language])

    return (
        <div className="public-analytics-page">

            <header className="public-analytics-header">

                <div className="public-analytics-brand">
                    <img src={logo} alt="Smart Aqmola" />
                    <span>SMART AQMOLA — {t("public_analytics_title")}</span>
                </div>

                <button
                    type="button"
                    className="header-channel-btn"
                    onClick={toggleLanguage}
                >
                    <strong>{language === "kz" ? "РУС" : "ҚАЗ"}</strong>
                </button>

            </header>

            <main className="public-analytics-content">
                <div
                    id="smart-aqmola-widget"
                    data-lang={language === "kz" ? "kz" : "ru"}
                    data-theme="light"
                />
            </main>

        </div>
    )
}

export default PublicAnalytics
