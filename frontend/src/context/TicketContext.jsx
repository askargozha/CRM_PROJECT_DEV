import {
    createContext,
    useContext,
    useEffect,
    useState
} from "react"

import {
    createTicket as createTicketRequest,
    deleteTicket as deleteTicketRequest,
    getTickets as getTicketsRequest,
    updateTicket as updateTicketRequest,
    reanalyzeTicket as reanalyzeTicketRequest,
    resendTicketEmail as resendTicketEmailRequest
} from "../api/ticketApi"

import { useAuth } from "./AuthContext"

const TicketContext = createContext(null)

function normalizeTicket(ticket) {

    return {
        ...ticket,

        date: ticket.created_date
            ? new Date(
                `${ticket.created_date}T00:00:00`
            ).toLocaleDateString("ru-RU")
            : ""
    }
}

function prepareTicketPayload(ticket) {

    return {
        applicant: ticket.applicant,
        phone: ticket.phone,
        description:
            ticket.description ||
            "Описание отсутствует",

        source:
            ticket.source ||
            "Веб-форма",

        district:
            ticket.district ||
            null,

        category:
            ticket.category ||
            null,

        operator:
            ticket.operator ||
            null,

        priority:
            ticket.priority ||
            "Средний",

        status:
            ticket.status ||
            "Новое",

        assigned_user_id:
            ticket.assigned_user_id ??
            null,

        deadline:
            ticket.deadline ||
            null
    }
}

export function TicketProvider({ children }) {

    const { user } = useAuth()

    const [tickets, setTickets] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {

        if (user) {
            loadTickets()
        } else {
            // Вышли из аккаунта (или ещё не вошли) — список
            // обязательно очищаем, чтобы следующий пользователь
            // в этой же вкладке браузера не увидел чужие обращения.
            setTickets([])
            setLoading(false)
        }

        // Перечитываем список при каждой смене залогиненного
        // пользователя (вход/выход/смена аккаунта без перезагрузки
        // страницы) — иначе у разных ролей может остаться старый,
        // ещё не отфильтрованный по правам список в памяти.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id])

    async function loadTickets() {

        try {

            setLoading(true)
            setError("")

            const response =
                await getTicketsRequest()

            setTickets(
                response.data.map(
                    normalizeTicket
                )
            )

        } catch (requestError) {

            console.error(
                "Ошибка загрузки обращений:",
                requestError
            )

            setError(
                requestError.message ||
                "Не удалось загрузить обращения"
            )

        } finally {

            setLoading(false)

        }
    }

    async function addTicket(newTicket) {

        try {

            setError("")

            const payload =
                prepareTicketPayload(
                    newTicket
                )

            const response =
                await createTicketRequest(
                    payload
                )

            const createdTicket =
                normalizeTicket(
                    response.data
                )

            setTickets(prevTickets => [
                ...prevTickets,
                createdTicket
            ])

            return createdTicket

        } catch (requestError) {

            console.error(
                "Ошибка создания обращения:",
                requestError
            )

            setError(
                requestError.message ||
                "Не удалось создать обращение"
            )

            throw requestError
        }
    }

    async function updateTicket(
        id,
        updatedData
    ) {

        try {

            setError("")

            const existingTicket =
                tickets.find(
                    ticket => ticket.id === id
                )

            if (!existingTicket) {
                throw new Error(
                    "Обращение не найдено"
                )
            }

            const mergedTicket = {
                ...existingTicket,
                ...updatedData
            }

            const payload =
                prepareTicketPayload(
                    mergedTicket
                )

            const response =
                await updateTicketRequest(
                    id,
                    payload
                )

            const updatedTicket =
                normalizeTicket(
                    response.data
                )

            setTickets(prevTickets =>
                prevTickets.map(ticket =>
                    ticket.id === id
                        ? updatedTicket
                        : ticket
                )
            )

            return updatedTicket

        } catch (requestError) {

            console.error(
                "Ошибка обновления обращения:",
                requestError
            )

            setError(
                requestError.message ||
                "Не удалось обновить обращение"
            )

            throw requestError
        }
    }

    async function updateTicketFields(
        id,
        fields
    ) {

        try {

            setError("")

            const response =
                await updateTicketRequest(
                    id,
                    fields
                )

            const updatedTicket =
                normalizeTicket(
                    response.data
                )

            setTickets(prevTickets =>
                prevTickets.map(ticket =>
                    ticket.id === id
                        ? updatedTicket
                        : ticket
                )
            )

            return updatedTicket

        } catch (requestError) {

            console.error(
                "Ошибка частичного обновления:",
                requestError
            )

            setError(
                requestError.message ||
                "Не удалось обновить обращение"
            )

            throw requestError
        }
    }

    async function deleteTicket(id) {

        try {

            setError("")

            await deleteTicketRequest(id)

            setTickets(prevTickets =>
                prevTickets.filter(
                    ticket =>
                        ticket.id !== id
                )
            )

        } catch (requestError) {

            console.error(
                "Ошибка удаления обращения:",
                requestError
            )

            setError(
                requestError.message ||
                "Не удалось удалить обращение"
            )

            throw requestError
        }
    }

    async function changeTicketStatus(
        id,
        newStatus
    ) {

        return updateTicketFields(
            id,
            {
                status: newStatus
            }
        )
    }

    async function assignTicketUser(
        id,
        userId
    ) {

        return updateTicketFields(
            id,
            {
                assigned_user_id:
                    userId === null
                        ? null
                        : Number(userId)
            }
        )
    }

    async function reanalyzeTicketAi(id) {

        try {

            setError("")

            const response =
                await reanalyzeTicketRequest(id)

            const updatedTicket =
                normalizeTicket(
                    response.data
                )

            setTickets(prevTickets =>
                prevTickets.map(ticket =>
                    ticket.id === id
                        ? updatedTicket
                        : ticket
                )
            )

            return updatedTicket

        } catch (requestError) {

            console.error(
                "Ошибка ИИ-анализа:",
                requestError
            )

            setError(
                requestError.message ||
                "Не удалось выполнить ИИ-анализ"
            )

            throw requestError
        }
    }

    async function resendTicketEmail(id, operatorId, manualEmail) {

        try {

            setError("")

            const response =
                await resendTicketEmailRequest(id, operatorId, manualEmail)

            const updatedTicket =
                normalizeTicket(
                    response.data
                )

            setTickets(prevTickets =>
                prevTickets.map(ticket =>
                    ticket.id === id
                        ? updatedTicket
                        : ticket
                )
            )

            return updatedTicket

        } catch (requestError) {

            console.error(
                "Ошибка отправки письма:",
                requestError
            )

            setError(
                requestError.message ||
                "Не удалось отправить письмо"
            )

            throw requestError
        }
    }

    return (
        <TicketContext.Provider
            value={{
                tickets,
                loading,
                error,
                loadTickets,
                addTicket,
                updateTicket,
                updateTicketFields,
                deleteTicket,
                changeTicketStatus,
                assignTicketUser,
                reanalyzeTicketAi,
                resendTicketEmail
            }}
        >
            {children}
        </TicketContext.Provider>
    )
}

export function useTickets() {

    const context =
        useContext(TicketContext)

    if (!context) {
        throw new Error(
            "useTickets должен использоваться внутри TicketProvider"
        )
    }

    return context
}