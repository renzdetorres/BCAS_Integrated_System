import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword, ApiError } from "../api/authApi.js";
import AuthShowcase from "../components/auth/AuthShowcase.jsx";
import Icon from "../components/ui/Icon.jsx";
import "../components/auth/AuthForm.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await forgotPassword(email.trim());
      setIsSent(true);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSent) {
    return (
      <main className="auth-page">
        <div className="auth-shell">
          <AuthShowcase />
          <section className="auth-form-side">
            <div className="auth-form-panel">
              <div className="auth-mobile-brand">
                <Icon name="graduation-cap" size={22} />
                BCAS
              </div>

              <span className="auth-success-icon">
                <Icon name="mail" size={24} />
              </span>
              <h1>Check your email</h1>
              <p className="auth-subtitle">
                If an account exists for <strong>{email}</strong>, we&apos;ve sent a link to reset your
                password. It expires in 30 minutes.
              </p>
              <Link className="auth-submit" to="/login">
                Back to login
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <AuthShowcase />

        <section className="auth-form-side">
          <div className="auth-form-panel">
            <div className="auth-mobile-brand">
              <Icon name="graduation-cap" size={22} />
              BCAS
            </div>

            <h1>Forgot your password?</h1>
            <p className="auth-subtitle">Enter the email on your account and we&apos;ll send you a reset link.</p>

            <form onSubmit={handleSubmit} noValidate>
              <div className="input-group">
                <label htmlFor="email">Email</label>
                <div className="input-with-icon">
                  <Icon name="mail" size={18} className="input-icon" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </div>

              {errorMessage && (
                <p className="form-error" role="alert">
                  {errorMessage}
                </p>
              )}

              <button type="submit" className="auth-submit" disabled={isSubmitting}>
                {isSubmitting && <span className="auth-spinner" aria-hidden="true" />}
                {isSubmitting ? "Sending..." : "Send reset link"}
              </button>
            </form>

            <p className="auth-switch">
              Remembered your password? <Link to="/login">Log in</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
