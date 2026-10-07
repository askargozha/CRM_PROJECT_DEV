import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.jsx"

import { TicketProvider } from "./context/TicketContext.jsx"
import { AuthProvider } from "./context/AuthContext.jsx"
import { LanguageProvider } from "./context/LanguageContext.jsx"

createRoot(
    document.getElementById("root")
).render(
    <StrictMode>

        <LanguageProvider>

            <AuthProvider>

                <TicketProvider>

                    <App />

                </TicketProvider>

            </AuthProvider>

        </LanguageProvider>

    </StrictMode>
)
