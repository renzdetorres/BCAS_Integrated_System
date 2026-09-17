import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser, ApiError } from "../api/authApi.js";
import { useSession } from "../context/SessionContext.jsx";
import "./LoginPage.css";

const initialForm = { email: "", password: "" };

export default function LoginPage() {
  const [form, setForm] = useState(initialForm);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      <main className="login-page">
        <div style={{ color: "#5c6b7a" }}>Loading...</div>
      </main>
    );
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <h1>Log In</h1>
        <p className="login-subtitle">Sign in to continue to your application.</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <label htmlFor="email">Email</label>
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

          <div className="form-row">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={handleChange}
            />
          </div>

          {errorMessage && (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          )}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Log In"}
          </button>
        </form>

        <Link className="login-link" to="/register">
          Need an account? Register
        </Link>
      </div>
    </main>
  );
}
