import UserManagementPage from "../components/UserManagementPage"
import { useLanguage } from "../context/LanguageContext"

const CITIZEN_ROLE_NAME = "Пользователь"

function Staff() {

    const { t } = useLanguage()

    return (
        <UserManagementPage
            pageTitle={t("nav_staff")}
            addButtonLabel={`+ ${t("staff_add_button")}`}
            matchesSection={(roleName) => roleName !== CITIZEN_ROLE_NAME}
            dropdownRoleFilter={(roleName) => roleName !== CITIZEN_ROLE_NAME}
        />
    )
}

export default Staff
