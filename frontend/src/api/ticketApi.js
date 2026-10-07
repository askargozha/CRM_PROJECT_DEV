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

function extractErrorMessage(detail) {

    // FastAPI/Pydantic при ошибке валидации (422) присылает detail
    // не строкой, а списком объектов вида
    // [{ msg: "Value error, ...", ... }] — берём текст из msg и
    // убираем техническую приставку, которую добавляет Pydantic v2.
    if (Array.isArray(detail)) {
        return detail
            .map((item) =>
                (item?.msg || String(item)).replace(/^Value error,\s*/, "")
            )
            .join("; ")
    }

    return detail
}

async function request(url, options = {}) {

    const response = await fetch(
        `${API_URL}${url}`,
        {
            ...options,
            headers: {
                ...getHeaders(),
                ...options.headers
            }
        }
    )

    if (!response.ok) {

        let errorMessage = "Ошибка запроса к серверу"

        try {
            const errorData = await response.json()

            errorMessage =
                extractErrorMessage(errorData.detail) ||
                errorData.message ||
                errorMessage
        } catch {
            // Сервер не вернул JSON
        }

        throw new Error(errorMessage)
    }

    if (response.status === 204) {
        return {
            data: null
        }
    }

    return {
        data: await response.json()
    }
}

export function getTickets() {
    return request("/tickets")
}

export function getTicketsAnalyticsSummary() {
    return request("/tickets/analytics-summary")
}

export function getPublicAnalyticsSummary() {
    return request("/public/analytics-summary")
}

export function getTicket(id) {
    return request(`/tickets/${id}`)
}

export function createTicket(ticketData) {
    return request(
        "/tickets",
        {
            method: "POST",
            body: JSON.stringify(ticketData)
        }
    )
}

export function updateTicket(
    id,
    ticketData
) {
    return request(
        `/tickets/${id}`,
        {
            method: "PATCH",
            body: JSON.stringify(ticketData)
        }
    )
}

export function deleteTicket(id) {
    return request(
        `/tickets/${id}`,
        {
            method: "DELETE"
        }
    )
}

export function reanalyzeTicket(id) {
    return request(
        `/tickets/${id}/analyze`,
        {
            method: "POST"
        }
    )
}

export function resendTicketEmail(id, operatorId, manualEmail) {
    return request(
        `/tickets/${id}/send-email`,
        {
            method: "POST",
            body: JSON.stringify({
                email_operator_id: operatorId || null,
                manual_email: manualEmail || null
            })
        }
    )
}

export async function sendTelegramReply(id, text, photoFile) {

    const token = localStorage.getItem("token")
    const formData = new FormData()

    if (text) {
        formData.append("text", text)
    }

    if (photoFile) {
        formData.append("photo", photoFile)
    }

    const response = await fetch(
        `${API_URL}/tickets/${id}/telegram-reply`,
        {
            method: "POST",
            headers: {
                ...(token
                    ? { Authorization: `Bearer ${token}` }
                    : {})
                // Content-Type специально не указываем — браузер сам
                // выставит multipart/form-data с нужной границей.
            },
            body: formData
        }
    )

    if (!response.ok) {

        let errorMessage = "Не удалось отправить ответ в Telegram"

        try {
            const errorData = await response.json()
            errorMessage = errorData.detail || errorMessage
        } catch {
            // сервер не вернул JSON
        }

        throw new Error(errorMessage)
    }

    return {
        data: await response.json()
    }
}

export function getTicketComments(id) {
    return request(`/tickets/${id}/comments`)
}

export function addTicketComment(id, text) {
    return request(
        `/tickets/${id}/comments`,
        {
            method: "POST",
            body: JSON.stringify({ text })
        }
    )
}

export async function downloadTicketsReport(dateFrom, dateTo, format = "pdf") {

    const token = localStorage.getItem("token")
    const params = new URLSearchParams()

    if (dateFrom) {
        params.set("date_from", dateFrom)
    }

    if (dateTo) {
        params.set("date_to", dateTo)
    }

    params.set("format", format)

    const query = params.toString()

    const response = await fetch(
        `${API_URL}/tickets/report${query ? `?${query}` : ""}`,
        {
            headers: {
                ...(token
                    ? { Authorization: `Bearer ${token}` }
                    : {})
            }
        }
    )

    if (!response.ok) {

        let errorMessage = "Не удалось сформировать отчёт"

        try {
            const errorData = await response.json()
            errorMessage = errorData.detail || errorMessage
        } catch {
            // сервер не вернул JSON
        }

        throw new Error(errorMessage)
    }

    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.href = downloadUrl
    link.download = `smart_aqmola_report.${format}`
    document.body.appendChild(link)
    link.click()
    link.remove()

    window.URL.revokeObjectURL(downloadUrl)
}