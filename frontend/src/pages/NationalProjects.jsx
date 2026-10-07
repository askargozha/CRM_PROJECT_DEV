import { useLanguage } from "../context/LanguageContext"

function NationalProjects() {

    const { t } = useLanguage()

    return (
        <div>
            <h2>{t("nav_national_projects")}</h2>

            <div className="page-message">
                <p>
                    {t("national_projects_placeholder")}
                </p>
            </div>
        </div>
    )
}

export default NationalProjects
