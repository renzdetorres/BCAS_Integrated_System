import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser, ApiError } from "../api/authApi.js";
import { useSession } from "../context/SessionContext.jsx";
import AuthShowcase from "../components/auth/AuthShowcase.jsx";
import Icon from "../components/ui/Icon.jsx";
import "../components/auth/AuthForm.css";
import "./LoginPage.css";

const initialForm = { email: "", password: "" };

export default function LoginPage() {
  const [form, setForm] = useState(initialForm);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { session, isLoading, setSession } = useSession();
  const navigate = useNavigate();

  // Already signed in (e.g. navigated here directly) - go straight to the portal.
  useEffect(() => {
    if (!isLoading && session) {
      navigate("/portal", { replace: true });
    }
  }, [isLoading, session, navigate]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const user = await loginUser(form);
      setSession(user);
      navigate("/portal", { replace: true });
    } catch (error) {
      // Same generic message regardless of whether the email exists,
      // mirroring the API's no-enumeration behavior.
      setErrorMessage(
        error instanceof ApiError ? error.message : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading || session) {
    return (
      <main className="auth-loading-page">
        <span className="auth-spinner" aria-hidden="true" />
        <span>Loading...</span>
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

            <h1>Welcome back</h1>
            <p className="auth-subtitle">Sign in to continue to your application.</p>

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
                    value={form.email}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="password">Password</label>
                <div className="input-with-icon has-toggle">
                  <Icon name="lock" size={18} className="input-icon" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={form.password}
                    onChange={handleChange}
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
              </div>

              {errorMessage && (
                <p className="form-error" role="alert">
                  {errorMessage}
                </p>
              )}

              <button type="submit" className="auth-submit" disabled={isSubmitting}>
                {isSubmitting && <span className="auth-spinner" aria-hidden="true" />}
                {isSubmitting ? "Signing in..." : "Log In"}
              </button>
            </form>

            <p className="auth-switch">
              Need an account? <Link to="/register">Register</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
