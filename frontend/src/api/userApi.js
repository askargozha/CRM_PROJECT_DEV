import { API_URL } from "./config"

function getHeaders() {

    const token = localStorage.getItem("token")

    return {
        "Content-Type": "application/json",
        ...(token
            ? {
                Authorization: `Bearer ${token}`
            }
            : {})
    }
}

async function extractError(response, fallback) {

    let errorMessage = fallback

    try {

        const errorData = await response.json()

        errorMessage =
            errorData.detail ||
            errorData.message ||
            errorMessage

    } catch {
        // Сервер не вернул JSON
    }

    return errorMessage
}

export async function getUsers() {

    const response = await fetch(
        `${API_URL}/users/`,
        {
            method: "GET",
            headers: getHeaders()
        }
    )

    if (!response.ok) {
        throw new Error(
            await extractError(response, "Не удалось загрузить пользователей")
        )
    }

    return {
        data: await response.json()
    }
}

export async function createUser(data) {

    const response = await fetch(
        `${API_URL}/users/`,
        {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(data)
        }
    )

    if (!response.ok) {
        throw new Error(
            await extractError(response, "Не удалось создать пользователя")
        )
    }

    return {
        data: await response.json()
    }
}

export async function updateUser(userId, data) {

    const response = await fetch(
        `${API_URL}/users/${userId}`,
        {
            method: "PATCH",
            headers: getHeaders(),
            body: JSON.stringify(data)
        }
    )

    if (!response.ok) {
        throw new Error(
            await extractError(response, "Не удалось обновить пользователя")
        )
    }

    return {
        data: await response.json()
    }
}

export async function deleteUser(userId) {

    const response = await fetch(
        `${API_URL}/users/${userId}`,
        {
            method: "DELETE",
            headers: getHeaders()
        }
    )

    if (!response.ok) {
        throw new Error(
            await extractError(response, "Не удалось удалить пользователя")
        )
    }

    return { data: null }
}
