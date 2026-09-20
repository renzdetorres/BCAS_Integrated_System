import { useState } from "react";
import { Link } from "react-router-dom";
import { registerApplicant, ApiError } from "../api/authApi.js";
import "./RegisterPage.css";

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export default function RegisterPage() {
  const [form, setForm] = useState(initialForm);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState(null);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);

    if (form.password !== form.confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await registerApplicant({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      setRegisteredEmail(result.email);
      setForm(initialForm);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (registeredEmail) {
    return (
      <main className="register-page">
        <div className="auth-brand">
          <span className="auth-brand-mark">BCAS</span>
          <span className="auth-brand-subtitle">Integrated Scholarship &amp; Admissions System</span>
        </div>
        <div className="register-card">
          <h1>Registration complete</h1>
          <p>
            Your applicant account for <strong>{registeredEmail}</strong> has been created.
            You can now log in.
          </p>
          <Link className="register-link" to="/login">
            Go to login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="register-page">
      <div className="auth-brand">
        <span className="auth-brand-mark">BCAS</span>
        <span className="auth-brand-subtitle">Integrated Scholarship &amp; Admissions System</span>
      </div>
      <div className="register-card">
        <h1>Applicant Registration</h1>
        <p className="register-subtitle">Create your account to start your application.</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <label htmlFor="firstName">First name</label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              autoComplete="given-name"
              required
              value={form.firstName}
              onChange={handleChange}
            />
          </div>

          <div className="form-row">
            <label htmlFor="lastName">Last name</label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              autoComplete="family-name"
              required
              value={form.lastName}
              onChange={handleChange}
            />
          </div>

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
              autoComplete="new-password"
              minLength={8}
              required
              value={form.password}
              onChange={handleChange}
            />
          </div>

          <div className="form-row">
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={form.confirmPassword}
              onChange={handleChange}
            />
          </div>

          {errorMessage && (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          )}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Register"}
          </button>
        </form>
      </div>
    </main>
  );
}
