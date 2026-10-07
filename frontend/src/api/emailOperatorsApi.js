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

export async function getEmailOperators() {

    const response = await fetch(
        `${API_URL}/email-operators`,
        {
            method: "GET",
            headers: getHeaders()
        }
    )

    if (!response.ok) {
        throw new Error(
            await extractError(response, "Не удалось загрузить операторов рассылки")
        )
    }

    return {
        data: await response.json()
    }
}

export async function createEmailOperator(data) {

    const response = await fetch(
        `${API_URL}/email-operators`,
        {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(data)
        }
    )

    if (!response.ok) {
        throw new Error(
            await extractError(response, "Не удалось добавить оператора")
        )
    }

    return {
        data: await response.json()
    }
}

export async function updateEmailOperator(operatorId, data) {

    const response = await fetch(
        `${API_URL}/email-operators/${operatorId}`,
        {
            method: "PATCH",
            headers: getHeaders(),
            body: JSON.stringify(data)
        }
    )

    if (!response.ok) {
        throw new Error(
            await extractError(response, "Не удалось обновить оператора")
        )
    }

    return {
        data: await response.json()
    }
}

export async function deleteEmailOperator(operatorId) {

    const response = await fetch(
        `${API_URL}/email-operators/${operatorId}`,
        {
            method: "DELETE",
            headers: getHeaders()
        }
    )

    if (!response.ok) {
        throw new Error(
            await extractError(response, "Не удалось удалить оператора")
        )
    }

    return { data: null }
}
