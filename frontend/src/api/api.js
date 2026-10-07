import axios from "axios"

import { API_URL } from "./config"

const api = axios.create({
    baseURL: API_URL
})

function extractErrorMessage(detail) {

    // FastAPI/Pydantic при ошибке валидации (422) присылает detail
    // не строкой, а списком объектов вида
    // [{ msg: "Value error, ...", loc: [...], ... }] — берём текст
    // из msg и убираем техническую приставку "Value error, ",
    // которую Pydantic v2 сам добавляет перед сообщением валидатора.
    if (Array.isArray(detail)) {
        return detail
            .map((item) =>
                (item?.msg || String(item)).replace(/^Value error,\s*/, "")
            )
            .join("; ")
    }

    return detail
}

api.interceptors.response.use(
    (response) => response,
    (error) => {

        const rawDetail =
            error.response?.data?.detail ||
            error.response?.data?.message

        const detail = extractErrorMessage(rawDetail)

        if (detail) {
            error.message = detail
        }

        return Promise.reject(error)
    }
)

export default api