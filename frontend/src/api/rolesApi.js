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

export async function getRoles() {

    const response = await fetch(
        `${API_URL}/roles`,
        {
            method: "GET",
            headers: getHeaders()
        }
    )

    if (!response.ok) {
        throw new Error("Не удалось загрузить роли")
    }

    return response.json()
}
