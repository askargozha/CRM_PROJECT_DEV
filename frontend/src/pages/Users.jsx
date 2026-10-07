import UserManagementPage from "../components/UserManagementPage"
import { useLanguage } from "../context/LanguageContext"

const CITIZEN_ROLE_NAME = "Пользователь"

function Users() {

    const { t } = useLanguage()

    return (
        <UserManagementPage
            pageTitle={t("users_page_title")}
            addButtonLabel={`+ ${t("users_add_button")}`}
            matchesSection={(roleName) => roleName === CITIZEN_ROLE_NAME}
            dropdownRoleFilter={(roleName) => roleName === CITIZEN_ROLE_NAME}
        />
    )
}

export default Users
