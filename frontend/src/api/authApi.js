import api from "./api"

export async function sendRegistrationCode(email) {
    const response = await api.post(
        "/auth/register/send-code",
        {
            email
        }
    )

    return response.data
}

export async function register(
    fullName,
    username,
    email,
    password,
    code
) {
    const response = await api.post(
        "/auth/register",
        {
            full_name: fullName,
            username,
            email,
            password,
            code
        }
    )

    return response.data
}

export async function login(username, password) {
    const response = await api.post(
        "/auth/login",
        {
            username,
            password
        }
    )

    return response.data
}

export async function getCurrentUser() {
    const token = localStorage.getItem("token")

    const response = await api.get(
        "/auth/me",
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    )

    return response.data
}