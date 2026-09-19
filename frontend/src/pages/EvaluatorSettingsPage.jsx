import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  changeMyEvaluatorPassword,
  getMyEvaluatorProfile,
  updateMyEvaluatorProfile,
} from "../api/evaluatorSettingsApi.js";
import { ApiError } from "../api/apiClient.js";
import "./EvaluatorSettingsPage.css";

const initialPasswordForm = { currentPassword: "", newPassword: "", confirmNewPassword: "" };

function toForm(profile) {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
  };
}

export default function EvaluatorSettingsPage() {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [savedMessage, setSavedMessage] = useState(null);

  const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSaved, setPasswordSaved] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getMyEvaluatorProfile()
      .then((profile) => {
        if (!cancelled) setForm(toForm(profile));
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof ApiError ? error.message : "Failed to load profile.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    setSavedMessage(null);
    setIsSubmitting(true);

    try {
      const saved = await updateMyEvaluatorProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
      });
      setForm(toForm(saved));
      setSavedMessage("Profile saved.");
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSaved(null);

    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }

    setIsChangingPassword(true);
    try {
      await changeMyEvaluatorPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm(initialPasswordForm);
      setPasswordSaved("Password changed.");
    } catch (error) {
      setPasswordError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    } finally {
      setIsChangingPassword(false);
    }
  }

  if (isLoading) {
    return (
      <main className="evaluator-settings-page">
        <div className="evaluator-settings-shell">
          <div className="evaluator-settings-card">Loading...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="evaluator-settings-page">
      <div className="evaluator-settings-shell">
        <Link className="evaluator-settings-back-link" to="/portal">
          &larr; Back to dashboard
        </Link>
        <h1 className="evaluator-settings-title">Settings</h1>

        <section className="evaluator-settings-card">
          <h2>Profile</h2>
          <p className="evaluator-settings-subtitle">You can update your name and email at any time.</p>

          {savedMessage && (
            <p className="form-success" role="status">
              {savedMessage}
            </p>
          )}
          {errorMessage && (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-row-group">
              <div className="form-row">
                <label htmlFor="firstName">First name</label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
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
                  required
                  value={form.lastName}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required value={form.email} onChange={handleChange} />
            </div>

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </section>

        <section className="evaluator-settings-card">
          <h2>Change Password</h2>
          <p className="evaluator-settings-subtitle">Enter your current password and choose a new one.</p>

          {passwordSaved && (
            <p className="form-success" role="status">
              {passwordSaved}
            </p>
          )}
          {passwordError && (
            <p className="form-error" role="alert">
              {passwordError}
            </p>
          )}

          <form onSubmit={handlePasswordSubmit} noValidate>
            <div className="form-row">
              <label htmlFor="currentPassword">Current password</label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
              />
            </div>

            <div className="form-row">
              <label htmlFor="newPassword">New password</label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
              />
            </div>

            <div className="form-row">
              <label htmlFor="confirmNewPassword">Confirm new password</label>
              <input
                id="confirmNewPassword"
                name="confirmNewPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={passwordForm.confirmNewPassword}
                onChange={handlePasswordChange}
              />
            </div>

            <button type="submit" disabled={isChangingPassword}>
              {isChangingPassword ? "Changing password..." : "Change Password"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
