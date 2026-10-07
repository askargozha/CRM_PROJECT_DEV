import { useState } from "react"

import logo from "../assets/logo.jpg"
import { useLanguage } from "../context/LanguageContext"
import { AKMOLA_DISTRICTS } from "../data/akmolaDistricts"
import { API_URL } from "../api/config"

// Список операторов — те же значения, что понимает ИИ-анализ и
// маршрутизация писем (см. backend/app/services/ai_service.py),
// намеренно не переводится на казахский — названия компаний везде
// одинаковые.
const OPERATOR_CHOICES = ["Kcell", "Beeline", "Tele2", "Казахтелеком"]

async function submitAituTicket(payload) {

    const response = await fetch(`${API_URL}/aitu/tickets`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    })

    if (!response.ok) {

        let errorMessage = "Не удалось отправить обращение"

        try {
            const errorData = await response.json()
            errorMessage = errorData.detail || errorMessage
        } catch {
            // сервер не вернул JSON
        }

        throw new Error(errorMessage)
    }

    return response.json()
}

function AituForm() {

    const { t, language, toggleLanguage } = useLanguage()

    const [applicant, setApplicant] = useState("")
    const [phone, setPhone] = useState("")
    const [district, setDistrict] = useState("")
    const [operator, setOperator] = useState("")
    const [description, setDescription] = useState("")

    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")
    const [createdTicketId, setCreatedTicketId] = useState(null)

    async function handleSubmit(event) {

        event.preventDefault()

        if (!applicant.trim() || !phone.trim() || !description.trim()) {
            setError(t("aitu_error_required"))
            return
        }

        try {

            setSubmitting(true)
            setError("")

            const result = await submitAituTicket({
                applicant: applicant.trim(),
                phone: phone.trim(),
                district: district || null,
                operator: operator || null,
                description: description.trim()
            })

            setCreatedTicketId(result.id)

        } catch (submitError) {

            setError(
                submitError.message ||
                t("aitu_error_generic")
            )

        } finally {

            setSubmitting(false)

        }
    }

    function handleCreateAnother() {
        setCreatedTicketId(null)
        setApplicant("")
        setPhone("")
        setDistrict("")
        setOperator("")
        setDescription("")
    }

    return (
        <div className="login-page aitu-page">

            <div className="login-corner tl" />
            <div className="login-corner tr" />
            <div className="login-corner bl" />
            <div className="login-corner br" />

            <div className="login-card">

                <img
                    src={logo}
                    alt="Smart Aqmola"
                    className="login-logo-badge"
                />

                <span className="login-brand-tag">
                    SMART AQMOLA
                </span>

                <p className="login-subtitle">
                    {t("aitu_subtitle")}
                </p>

                <button
                    type="button"
                    className="aitu-lang-toggle"
                    onClick={toggleLanguage}
                >
                    {language === "kz" ? "РУС" : "ҚАЗ"}
                </button>

                {createdTicketId ? (
                    <div className="login-success">
                        <p>
                            ✅ {t("aitu_success_prefix")} №{createdTicketId}
                        </p>
                        <p style={{ marginTop: 8 }}>
                            {t("aitu_success_hint")}
                        </p>

                        <button
                            type="button"
                            className="create-btn"
                            style={{ marginTop: 16, width: "100%" }}
                            onClick={handleCreateAnother}
                        >
                            {t("aitu_create_another")}
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>

                        {error && (
                            <div className="login-error">
                                {error}
                            </div>
                        )}

                        <label>{t("register_fullname_label")}</label>
                        <input
                            className="modal-input"
                            style={{ width: "100%", marginBottom: 12 }}
                            value={applicant}
                            onChange={(event) => setApplicant(event.target.value)}
                            placeholder={t("aitu_fullname_placeholder")}
                        />

                        <label>{t("table_col_phone")}</label>
                        <input
                            className="modal-input"
                            style={{ width: "100%", marginBottom: 12 }}
                            value={phone}
                            onChange={(event) => setPhone(event.target.value)}
                            placeholder="+7 7XX XXX XX XX"
                            type="tel"
                        />

                        <label>{t("table_col_district")}</label>
                        <select
                            className="modal-input"
                            style={{ width: "100%", marginBottom: 12 }}
                            value={district}
                            onChange={(event) => setDistrict(event.target.value)}
                        >
                            <option value="">
                                {t("aitu_select_placeholder")}
                            </option>
                            {AKMOLA_DISTRICTS.map((item) => (
                                <option key={item.name} value={item.name}>
                                    {item.type === "city" ? "г. " : ""}
                                    {item.name}
                                    {item.type === "district" ? " р-н" : ""}
                                </option>
                            ))}
                        </select>

                        <label>{t("table_col_operator")}</label>
                        <select
                            className="modal-input"
                            style={{ width: "100%", marginBottom: 12 }}
                            value={operator}
                            onChange={(event) => setOperator(event.target.value)}
                        >
                            <option value="">
                                {t("aitu_operator_unknown")}
                            </option>
                            {OPERATOR_CHOICES.map((name) => (
                                <option key={name} value={name}>
                                    {name}
                                </option>
                            ))}
                        </select>

                        <label>{t("table_col_description")}</label>
                        <textarea
                            className="modal-textarea"
                            style={{ width: "100%", minHeight: 100, marginBottom: 16 }}
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            placeholder={t("aitu_description_placeholder")}
                        />

                        <button
                            type="submit"
                            className="create-btn"
                            style={{ width: "100%" }}
                            disabled={submitting}
                        >
                            {submitting
                                ? t("aitu_submitting")
                                : t("aitu_submit")}
                        </button>

                    </form>
                )}

            </div>

        </div>
    )
}

export default AituForm
