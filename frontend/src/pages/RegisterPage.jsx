import { useState } from "react";
import { Link } from "react-router-dom";
import { registerApplicant, ApiError } from "../api/authApi.js";
import AuthShowcase from "../components/auth/AuthShowcase.jsx";
import Icon from "../components/ui/Icon.jsx";
import "../components/auth/AuthForm.css";
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
              <h1>Registration complete</h1>
              <p className="auth-subtitle">
                Your applicant account for <strong>{registeredEmail}</strong> has been created. You
                can now log in.
              </p>
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

            <h1>Create your account</h1>
            <p className="auth-subtitle">Register as an applicant to start your application.</p>

            <form onSubmit={handleSubmit} noValidate>
              <div className="input-row-group">
                <div className="input-group">
                  <label htmlFor="firstName">First name</label>
                  <div className="input-with-icon">
                    <Icon name="user" size={18} className="input-icon" />
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
                </div>
                <div className="input-group">
                  <label htmlFor="lastName">Last name</label>
                  <div className="input-with-icon">
                    <Icon name="user" size={18} className="input-icon" />
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
                </div>
              </div>

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
                    autoComplete="new-password"
                    minLength={8}
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
                <p className="input-hint">At least 8 characters.</p>
              </div>

              <div className="input-group">
                <label htmlFor="confirmPassword">Confirm password</label>
                <div className="input-with-icon has-toggle">
                  <Icon name="lock" size={18} className="input-icon" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={form.confirmPassword}
                    onChange={handleChange}
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
                </p>
              )}

              <button type="submit" className="auth-submit" disabled={isSubmitting}>
                {isSubmitting && <span className="auth-spinner" aria-hidden="true" />}
                {isSubmitting ? "Creating account..." : "Register"}
              </button>
            </form>

            <p className="auth-switch">
              Already have an account? <Link to="/login">Log in</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
