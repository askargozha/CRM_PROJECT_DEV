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

export async function getIncomingEmails() {

    const response = await fetch(
        `${API_URL}/incoming-emails`,
        {
            method: "GET",
            headers: getHeaders()
        }
    )

    if (!response.ok) {
        throw new Error(
            await extractError(response, "Не удалось загрузить входящие письма")
        )
    }

    return {
        data: await response.json()
    }
}

export async function fetchIncomingEmailsNow() {

    const response = await fetch(
        `${API_URL}/incoming-emails/fetch`,
        {
            method: "POST",
            headers: getHeaders()
        }
    )

    if (!response.ok) {
        throw new Error(
            await extractError(response, "Не удалось проверить почту")
        )
    }

    return {
        data: await response.json()
    }
}

export async function markIncomingEmailRead(id) {

    const response = await fetch(
        `${API_URL}/incoming-emails/${id}/read`,
        {
            method: "PATCH",
            headers: getHeaders()
        }
    )

    if (!response.ok) {
        throw new Error(
            await extractError(response, "Не удалось отметить письмо прочитанным")
        )
    }

    return {
        data: await response.json()
    }
}
