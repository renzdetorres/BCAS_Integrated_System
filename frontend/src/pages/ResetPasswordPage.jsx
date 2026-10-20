import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { resetPassword, ApiError } from "../api/authApi.js";
import AuthShowcase from "../components/auth/AuthShowcase.jsx";
import Icon from "../components/ui/Icon.jsx";
import "../components/auth/AuthForm.css";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReset, setIsReset] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword({ token, newPassword });
      setIsReset(true);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
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

              <h1>Reset link missing</h1>
              <p className="auth-subtitle">
                This page needs a reset link from your email to work. If you don&apos;t have one, request a new
                one below.
              </p>
              <Link className="auth-submit" to="/forgot-password">
                Request a reset link
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (isReset) {
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
                <Icon name="check" size={24} />
              </span>
              <h1>Password reset</h1>
              <p className="auth-subtitle">Your password has been changed. You can now log in with it.</p>
              <Link className="auth-submit" to="/login">
                Go to login
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

            <h1>Choose a new password</h1>
            <p className="auth-subtitle">Enter and confirm your new password below.</p>

            <form onSubmit={handleSubmit} noValidate>
              <div className="input-group">
                <label htmlFor="newPassword">New password</label>
                <div className="input-with-icon has-toggle">
                  <Icon name="lock" size={18} className="input-icon" />
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((show) => !show)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <Icon name={showPassword ? "eye-off" : "eye"} size={18} />
                  </button>
                </div>
                <p className="input-hint">At least 8 characters.</p>
              </div>

              <div className="input-group">
                <label htmlFor="confirmPassword">Confirm new password</label>
                <div className="input-with-icon has-toggle">
                  <Icon name="lock" size={18} className="input-icon" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword((show) => !show)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    <Icon name={showConfirmPassword ? "eye-off" : "eye"} size={18} />
                  </button>
                </div>
              </div>

              {errorMessage && (
                <p className="form-error" role="alert">
                  {errorMessage}
                  {errorMessage.toLowerCase().includes("expired") || errorMessage.toLowerCase().includes("invalid") ? (
                    <>
                      {" "}
                      <Link to="/forgot-password">Request a new link</Link>.
                    </>
                  ) : null}
                </p>
              )}

              <button type="submit" className="auth-submit" disabled={isSubmitting}>
                {isSubmitting && <span className="auth-spinner" aria-hidden="true" />}
                {isSubmitting ? "Resetting..." : "Reset password"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
