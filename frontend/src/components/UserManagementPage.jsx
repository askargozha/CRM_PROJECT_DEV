import { useEffect, useState } from "react"

import {
    getUsers,
    createUser,
    updateUser,
    deleteUser
} from "../api/userApi"
import { getRoles } from "../api/rolesApi"
import { useAuth } from "../context/AuthContext"
import { useLanguage } from "../context/LanguageContext"

function UserModal({ roles, user, onClose, onSaved }) {

    const { t } = useLanguage()
    const showRoleSelect = roles.length > 1

    const [fullName, setFullName] = useState(user?.full_name || "")
    const [username, setUsername] = useState(user?.username || "")
    const [email, setEmail] = useState(user?.email || "")
    const [password, setPassword] = useState("")
    const [roleId, setRoleId] = useState(
        user?.role_id || (roles[0]?.id ?? "")
    )
    const [isActive, setIsActive] = useState(
        user ? user.is_active : true
    )
    const [error, setError] = useState("")
    const [saving, setSaving] = useState(false)

    async function handleSave() {

        if (!fullName.trim() || !username.trim() || !email.trim()) {
            setError(t("usermgmt_error_required"))
            return
        }

        if (!user && !password.trim()) {
            setError(t("usermgmt_error_password"))
            return
        }

        try {
            setSaving(true)
            setError("")

            if (user) {

                const payload = {
                    full_name: fullName,
                    username,
                    email,
                    role_id: Number(roleId),
                    is_active: isActive
                }

                if (password.trim()) {
                    payload.password = password
                }

                await updateUser(user.id, payload)

            } else {

                await createUser({
                    full_name: fullName,
                    username,
                    email,
                    password,
                    role_id: Number(roleId),
                    is_active: isActive
                })
            }

            onSaved()
            onClose()

        } catch (err) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="modal-overlay">
            <div className="modal">

                <div className="modal-header">
                    <h2>
                        {user ? t("usermgmt_edit_title") : t("usermgmt_new_title")}
                    </h2>
                    <button className="close-btn" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className="modal-body">

                    {error && (
                        <p style={{ color: "#dc2626", marginBottom: 10 }}>
                            {error}
                        </p>
                    )}

                    <label>{t("register_fullname_label")}</label>
                    <input
                        className="modal-input"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                    />

                    <label>{t("login_username_label")}</label>
                    <input
                        className="modal-input"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />

                    <label>Email</label>
                    <input
                        className="modal-input"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    <label>
                        {user ? t("usermgmt_new_password") : t("login_password_label")}
                    </label>
                    <input
                        className="modal-input"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    {showRoleSelect && (
                        <>
                            <label>{t("usermgmt_role")}</label>
                            <select
                                className="modal-input"
                                value={roleId}
                                onChange={(e) => setRoleId(e.target.value)}
                            >
                                {roles.map((role) => (
                                    <option key={role.id} value={role.id}>
                                        {role.name}
                                    </option>
                                ))}
                            </select>
                        </>
                    )}

                    <label>
                        <input
                            type="checkbox"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            style={{ marginRight: 8 }}
                        />
                        {t("usermgmt_active_checkbox")}
                    </label>

                    <div className="modal-buttons">
                        <button className="cancel-btn" onClick={onClose}>
                            {t("modal_cancel")}
                        </button>
                        <button
                            className="create-btn"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? t("modal_saving") : t("modal_save")}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    )
}

/**
 * Общая страница управления учётными записями.
 *
 * matchesSection(roleName) — какие роли показывать в таблице этой
 * страницы (например, только "Пользователь", либо всё, кроме него).
 *
 * dropdownRoleFilter(roleName) — какие роли можно выбрать при
 * создании/редактировании записи с этой страницы. Если после
 * фильтрации остаётся ровно одна роль — выпадающий список вообще
 * не показывается, роль подставляется автоматически.
 */
function UserManagementPage({
    pageTitle,
    addButtonLabel,
    matchesSection,
    dropdownRoleFilter
}) {

    const { user: currentUser } = useAuth()
    const { t } = useLanguage()

    const [allUsers, setAllUsers] = useState([])
    const [allRoles, setAllRoles] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [modalUser, setModalUser] = useState(undefined)

    async function loadData() {

        try {
            setLoading(true)
            setError("")

            const [usersRes, rolesRes] = await Promise.all([
                getUsers(),
                getRoles()
            ])

            setAllUsers(usersRes.data)
            setAllRoles(rolesRes)

        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    async function handleDelete(id) {

        if (!window.confirm(t("usermgmt_confirm_delete"))) {
            return
        }

        try {
            await deleteUser(id)
            loadData()
        } catch (err) {
            alert(err.message)
        }
    }

    if (currentUser?.role_name !== "Администратор") {
        return (
            <div className="page-message">
                <p>{t("usermgmt_admin_only")}</p>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="page-message">
                <div className="loader"></div>
                <p>{t("usermgmt_loading")}</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="page-message">
                <p>{error}</p>
                <button className="retry-btn" onClick={loadData}>
                    {t("tickets_retry")}
                </button>
            </div>
        )
    }

    const users = allUsers.filter(
        (u) => matchesSection(u.role?.name)
    )

    const modalRoles = allRoles.filter(
        (role) => dropdownRoleFilter(role.name)
    )

    return (
        <div className="table-container">
            <h2>{pageTitle}</h2>

            <button
                className="create-btn"
                style={{ marginBottom: 20 }}
                onClick={() => setModalUser(null)}
            >
                {addButtonLabel}
            </button>

            <table>
                <thead>
                    <tr>
                        <th>{t("register_fullname_label")}</th>
                        <th>{t("login_username_label")}</th>
                        <th>Email</th>
                        <th>{t("usermgmt_role")}</th>
                        <th>{t("usermgmt_status")}</th>
                        <th>{t("usermgmt_actions")}</th>
                    </tr>
                </thead>
                <tbody>
                    {users.length === 0 ? (
                        <tr>
                            <td colSpan="6" className="empty-table">
                                {t("usermgmt_empty")}
                            </td>
                        </tr>
                    ) : (
                        users.map((u) => (
                            <tr key={u.id}>
                                <td>{u.full_name}</td>
                                <td>{u.username}</td>
                                <td>{u.email}</td>
                                <td>{u.role?.name ?? "—"}</td>
                                <td>
                                    <span
                                        className="status"
                                        style={{
                                            background: u.is_active
                                                ? "#16a34a"
                                                : "#9ca3af"
                                        }}
                                    >
                                        {u.is_active ? t("usermgmt_active") : t("usermgmt_disabled")}
                                    </span>
                                </td>
                                <td>
                                    <button
                                        className="create-btn"
                                        style={{ marginRight: 8 }}
                                        onClick={() => setModalUser(u)}
                                    >
                                        {t("usermgmt_change")}
                                    </button>
                                    <button
                                        className="cancel-btn"
                                        onClick={() => handleDelete(u.id)}
                                        disabled={u.id === currentUser.id}
                                    >
                                        {t("details_delete")}
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {modalUser !== undefined && (
                <UserModal
                    roles={modalRoles}
                    user={modalUser}
                    onClose={() => setModalUser(undefined)}
                    onSaved={loadData}
                />
            )}
        </div>
    )
}

export default UserManagementPage
