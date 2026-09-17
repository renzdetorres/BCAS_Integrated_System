import { useState } from "react";
import { Link } from "react-router-dom";
import { loginUser, logoutUser, ApiError } from "../api/authApi.js";
import "./LoginPage.css";

const initialForm = { email: "", password: "" };

export default function LoginPage() {
  const [form, setForm] = useState(initialForm);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);

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
      setLoggedInUser(user);
      setForm(initialForm);
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

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logoutUser();
    } finally {
      // Clear local state regardless of network outcome - the server-side
      // cookie clear is what actually ends the session.
      setLoggedInUser(null);
      setIsLoggingOut(false);
    }
  }

  if (loggedInUser) {
    return (
      <main className="login-page">
        <div className="login-card">
          <h1>Welcome back</h1>
          <p>
            Signed in as <strong>{loggedInUser.email}</strong> ({loggedInUser.role}).
          </p>
          <button type="button" onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? "Logging out..." : "Log Out"}
          </button>
        </div>
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
