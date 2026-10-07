import { useEffect, useState } from "react"
import {
    Link,
    Navigate,
    useNavigate
} from "react-router-dom"

import { register, sendRegistrationCode } from "../api/authApi"
import { useAuth } from "../context/AuthContext"
import { useLanguage } from "../context/LanguageContext"
import logo from "../assets/logo.jpg"

function Register() {

    const [step, setStep] = useState("form")

    const [fullName, setFullName] = useState("")
    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [passwordConfirm, setPasswordConfirm] = useState("")

    const [code, setCode] = useState("")

    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [resending, setResending] = useState(false)
    const [resendMessage, setResendMessage] = useState("")

    const navigate = useNavigate()
    const { t } = useLanguage()

    const {
        user,
        loading
    } = useAuth()

    useEffect(() => {
        setError("")
    }, [fullName, username, email, password, passwordConfirm, code])

    function getPasswordStrengthError(value) {

        if (value.length < 8) {
            return t("register_error_password_short")
        }

        if (!/[A-ZА-ЯЁ]/.test(value)) {
            return t("register_error_password_no_upper")
        }

        if (!/[a-zа-яё]/.test(value)) {
            return t("register_error_password_no_lower")
        }

        if (!/\d/.test(value)) {
            return t("register_error_password_no_digit")
        }

        if (!/[^\w\s]/.test(value)) {
            return t("register_error_password_no_symbol")
        }

        return ""
    }

    async function handleSendCode(event) {

        event.preventDefault()

        if (password !== passwordConfirm) {
            setError(t("register_error_password_mismatch"))
            return
        }

        const passwordError = getPasswordStrengthError(password)

        if (passwordError) {
            setError(passwordError)
            return
        }

        try {

            setSubmitting(true)
            setError("")

            await sendRegistrationCode(
                email.trim().toLowerCase()
            )

            setStep("code")

        } catch (err) {

            setError(
                err?.response?.data?.detail
                || t("register_error_send_code")
            )

        } finally {

            setSubmitting(false)

        }
    }

    async function handleResendCode() {

        try {

            setResending(true)
            setError("")
            setResendMessage("")

            await sendRegistrationCode(
                email.trim().toLowerCase()
            )

            setResendMessage(t("register_code_resent"))

        } catch (err) {

            setError(
                err?.response?.data?.detail
                || t("register_error_resend_code")
            )

        } finally {

            setResending(false)

        }
    }

    async function handleVerifyAndRegister(event) {

        event.preventDefault()

        if (code.trim().length !== 6) {
            setError(t("register_error_code_length"))
            return
        }

        try {

            setSubmitting(true)
            setError("")

            await register(
                fullName.trim(),
                username.trim().toLowerCase(),
                email.trim().toLowerCase(),
                password,
                code.trim()
            )

            setSuccess(true)

            setTimeout(() => {
                navigate("/login", { replace: true })
            }, 1500)

        } catch (err) {

            setError(
                err?.response?.data?.detail
                || t("register_error_verify")
            )

        } finally {

            setSubmitting(false)

        }
    }

    if (loading) {
        return (
            <div className="login-page">
                <div className="loader"></div>
            </div>
        )
    }

    if (user) {
        return (
            <Navigate
                to="/"
                replace
            />
        )
    }

    return (
        <div className="login-page">

            <div className="login-corner tl" />
            <div className="login-corner tr" />
            <div className="login-corner bl" />
            <div className="login-corner br" />

            {step === "form" && (
                <form
                    className="login-card"
                    onSubmit={handleSendCode}
                >

                    <img
                        src={logo}
                        alt="Smart Aqmola"
                        className="login-logo-badge"
                    />

                    <span className="login-brand-tag">
                        SMART AQMOLA
                    </span>

                    <h1>{t("register_title")}</h1>

                    <p className="login-subtitle">
                        {t("register_subtitle")}
                    </p>

                    {error && (
                        <div className="login-error">
                            {error}
                        </div>
                    )}

                    <label>
                        {t("register_fullname_label")}
                    </label>

                    <input
                        value={fullName}
                        onChange={(event) =>
                            setFullName(event.target.value)
                        }
                        placeholder={t("register_fullname_placeholder")}
                        autoComplete="name"
                        required
                    />

                    <label>
                        {t("login_username_label")}
                    </label>

                    <input
                        value={username}
                        onChange={(event) =>
                            setUsername(event.target.value)
                        }
                        placeholder={t("register_username_placeholder")}
                        autoComplete="username"
                        required
                    />

                    <label>
                        Email
                    </label>

                    <input
                        type="email"
                        value={email}
                        onChange={(event) =>
                            setEmail(event.target.value)
                        }
                        placeholder={t("register_email_placeholder")}
                        autoComplete="email"
                        required
                    />

                    <label>
                        {t("login_password_label")}
                    </label>

                    <input
                        type="password"
                        value={password}
                        onChange={(event) =>
                            setPassword(event.target.value)
                        }
                        placeholder={t("register_password_placeholder")}
                        autoComplete="new-password"
                        required
                    />

                    <p className="password-hint">
                        {t("register_password_hint")}
                    </p>

                    <label>
                        {t("register_password_confirm_label")}
                    </label>

                    <input
                        type="password"
                        value={passwordConfirm}
                        onChange={(event) =>
                            setPasswordConfirm(event.target.value)
                        }
                        placeholder={t("register_password_confirm_placeholder")}
                        autoComplete="new-password"
                        required
                    />

                    <button
                        type="submit"
                        disabled={submitting}
                    >
                        {submitting
                            ? t("register_sending_code")
                            : t("register_get_code")
                        }
                    </button>

                    <p className="login-subtitle">
                        {t("register_have_account")}{" "}
                        <Link to="/login">
                            {t("login_submit")}
                        </Link>
                    </p>

                </form>
            )}

            {step === "code" && (
                <form
                    className="login-card"
                    onSubmit={handleVerifyAndRegister}
                >

                    <img
                        src={logo}
                        alt="Smart Aqmola"
                        className="login-logo-badge"
                    />

                    <span className="login-brand-tag">
                        SMART AQMOLA
                    </span>

                    <h1>{t("register_confirm_title")}</h1>

                    <p className="login-subtitle">
                        {t("register_confirm_subtitle_1")} {email}.
                        {" "}{t("register_confirm_subtitle_2")}
                    </p>

                    {error && (
                        <div className="login-error">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="login-success">
                            {t("register_success")}
                        </div>
                    )}

                    {resendMessage && !error && (
                        <div className="login-success">
                            {resendMessage}
                        </div>
                    )}

                    <label>
                        {t("register_code_label")}
                    </label>

                    <input
                        value={code}
                        onChange={(event) =>
                            setCode(
                                event.target.value
                                    .replace(/\D/g, "")
                                    .slice(0, 6)
                            )
                        }
                        placeholder="000000"
                        inputMode="numeric"
                        maxLength={6}
                        autoComplete="one-time-code"
                        required
                    />

                    <button
                        type="submit"
                        disabled={submitting || success}
                    >
                        {submitting
                            ? t("register_verifying")
                            : t("register_verify_submit")
                        }
                    </button>

                    <p className="login-subtitle">
                        {t("register_no_code")}{" "}
                        <button
                            type="button"
                            className="link-button"
                            onClick={handleResendCode}
                            disabled={resending || success}
                        >
                            {resending
                                ? t("register_resending")
                                : t("register_resend")
                            }
                        </button>
                    </p>

                    <p className="login-subtitle">
                        <button
                            type="button"
                            className="link-button"
                            onClick={() => {
                                setStep("form")
                                setCode("")
                                setError("")
                                setResendMessage("")
                            }}
                            disabled={success}
                        >
                            ← {t("register_change_data")}
                        </button>
                    </p>

                </form>
            )}

        </div>
    )
}

export default Register
