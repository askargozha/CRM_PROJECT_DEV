import {
    createContext,
    useContext,
    useState
} from "react"

import { translations } from "../i18n/translations"

const LanguageContext = createContext(null)

const STORAGE_KEY = "language"

function getInitialLanguage() {

    const saved = localStorage.getItem(STORAGE_KEY)

    return saved === "kz" || saved === "ru"
        ? saved
        : "ru"
}

export function LanguageProvider({ children }) {

    const [language, setLanguageState] = useState(
        getInitialLanguage()
    )

    function setLanguage(nextLanguage) {
        setLanguageState(nextLanguage)
        localStorage.setItem(STORAGE_KEY, nextLanguage)
    }

    function toggleLanguage() {
        setLanguage(language === "ru" ? "kz" : "ru")
    }

    function t(key) {

        const entry = translations[key]

        if (!entry) {
            return key
        }

        return entry[language] || entry.ru || key
    }

    return (
        <LanguageContext.Provider
            value={{
                language,
                setLanguage,
                toggleLanguage,
                t
            }}
        >
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage() {

    const context = useContext(LanguageContext)

    if (!context) {
        throw new Error(
            "useLanguage должен использоваться внутри LanguageProvider"
        )
    }

    return context
}
