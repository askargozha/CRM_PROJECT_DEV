import { useState } from "react"

import { useAuth } from "../context/AuthContext"
import { useLanguage } from "../context/LanguageContext"

const CITIZEN_ROLE_NAME = "Пользователь"

const DISTRICTS = [
    { value: "Аккольский", kz: "Ақкөл ауданы" },
    { value: "Аршалынский", kz: "Аршалы ауданы" },
    { value: "Астраханский", kz: "Астрахан ауданы" },
    { value: "Атбасарский", kz: "Атбасар ауданы" },
    { value: "Буландынский", kz: "Бұланды ауданы" },
    { value: "Бурабайский", kz: "Бурабай ауданы" },
    { value: "Егиндыкольский", kz: "Егіндікөл ауданы" },
    { value: "Ерейментауский", kz: "Ерейментау ауданы" },
    { value: "Есильский", kz: "Есіл ауданы" },
    { value: "Жаксынский", kz: "Жақсы ауданы" },
    { value: "Жаркаинский", kz: "Жарқайың ауданы" },
    { value: "Зерендинский", kz: "Зеренді ауданы" },
    { value: "Коргалжынский", kz: "Қорғалжын ауданы" },
    { value: "район Биржан сал", kz: "Біржан сал ауданы" },
    { value: "Сандыктауский", kz: "Сандықтау ауданы" },
    { value: "Целиноградский", kz: "Целиноград ауданы" },
    { value: "Шортандинский", kz: "Шортанды ауданы" },
    { value: "г. Кокшетау", kz: "Көкшетау қаласы" }
]

function CreateTicketModal({
    onAdd,
    onUpdate,
    onClose,
    ticket = null
}) {

    const { user } = useAuth()
    const { t, language } = useLanguage()
    const isCitizen = user?.role_name === CITIZEN_ROLE_NAME

    const [applicant, setApplicant] = useState(ticket?.applicant || "")
    const [phone, setPhone] = useState(ticket?.phone || "")
    const [district, setDistrict] = useState(ticket?.district || "")
    const [operator, setOperator] = useState(ticket?.operator || "")
    const [priority, setPriority] = useState(ticket?.priority || "Средний")
    const [description, setDescription] = useState(ticket?.description || "")
    const [error, setError] = useState("")
    const [saving, setSaving] = useState(false)

    async function handleSave() {

        if (!applicant.trim()) {
            setError(t("modal_error_fullname"))
            return
        }

        const today = new Date()

        const date = ticket
            ? ticket.date
            : today.toLocaleDateString(language === "kz" ? "kk-KZ" : "ru-RU")

        const ticketData = {

            applicant,

            phone,

            district: district || null,

            operator: operator || null,

            priority,

            description,

            status: ticket ? ticket.status : "Новое",

            date

        }

        try {

            setSaving(true)
            setError("")

            if (ticket) {

                await onUpdate(ticket.id, ticketData)

            } else {

                await onAdd(ticketData)

            }

            onClose()

        } catch (requestError) {

            setError(
                requestError.message ||
                t("modal_error_save")
            )

        } finally {

            setSaving(false)

        }
    }

    return (

        <div className="modal-overlay">

            <div className="modal">

                <div className="modal-header">

                    <h2>
                        {ticket ? t("modal_edit_title") : t("modal_create_title")}
                    </h2>

                    <button
                        className="close-btn"
                        onClick={onClose}
                    >
                        ✕
                    </button>

                </div>

                <div className="modal-body">

                    {error && (
                        <p style={{ color: "#B4402F", marginBottom: 10, fontSize: 13.5 }}>
                            {error}
                        </p>
                    )}

                    <label>{t("register_fullname_label")}</label>

                    <input
                        className="modal-input"
                        value={applicant}
                        onChange={(e) => setApplicant(e.target.value)}
                    />

                    <label>{t("table_col_phone")}</label>

                    <input
                        className="modal-input"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                    />

                    <label>{t("table_col_district")}</label>

                    <select
                        className="modal-input"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                    >
                        <option value="">{t("filter_district_unknown")}</option>
                        {DISTRICTS.map((item) => (
                            <option key={item.value} value={item.value}>
                                {language === "kz" ? item.kz : item.value}
                            </option>
                        ))}
                    </select>

                    <label>{t("table_col_operator")}</label>

                    <select
                        className="modal-input"
                        value={operator}
                        onChange={(e) => setOperator(e.target.value)}
                    >
                        <option value="">{t("modal_operator_ai_placeholder")}</option>
                        <option>Казахтелеком</option>
                        <option>Beeline</option>
                        <option>Kcell</option>
                        <option>Tele2</option>
                    </select>

                    {!isCitizen && (
                        <>
                            <label>{t("table_col_priority")}</label>

                            <select
                                className="modal-input"
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                            >
                                <option value="Высокий">{t("priority_high")}</option>
                                <option value="Средний">{t("priority_medium")}</option>
                                <option value="Низкий">{t("priority_low")}</option>
                            </select>
                        </>
                    )}

                    <label>{t("table_col_description")}</label>

                    <textarea
                        className="modal-textarea"
                        rows="5"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />

                    <div className="modal-buttons">

                        <button
                            className="cancel-btn"
                            onClick={onClose}
                            disabled={saving}
                        >
                            {t("modal_cancel")}
                        </button>

                        <button
                            className="save-btn"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving
                                ? t("modal_saving")
                                : ticket ? t("modal_save_changes") : t("modal_save")}
                        </button>

                    </div>

                </div>

            </div>

        </div>

    )

}

export default CreateTicketModal
