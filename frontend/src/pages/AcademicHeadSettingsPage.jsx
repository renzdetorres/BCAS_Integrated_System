import { useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell.jsx";
import Card from "../components/ui/Card.jsx";
import { inputClasses, labelClasses, primaryButtonClasses } from "../lib/formStyles.js";
import {
  changeMyAcademicHeadPassword,
  getMyAcademicHeadProfile,
  updateMyAcademicHeadProfile,
} from "../api/academicHeadSettingsApi.js";
import { ApiError } from "../api/apiClient.js";

const initialPasswordForm = { currentPassword: "", newPassword: "", confirmNewPassword: "" };

function toForm(profile) {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
  };
}

export default function AcademicHeadSettingsPage() {
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

    getMyAcademicHeadProfile()
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
      const saved = await updateMyAcademicHeadProfile({
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
      await changeMyAcademicHeadPassword({
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

  return (
    <AppShell>
      <h1 className="text-2xl font-extrabold text-slate-900">Settings</h1>
      <p className="mt-1 text-sm text-slate-500">Manage your preferences and account security.</p>

      {isLoading ? (
        <p className="mt-6 text-sm text-slate-400">Loading...</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="text-lg font-bold text-slate-900">Profile</h2>
            <p className="mt-1 text-sm text-slate-500">You can update your name and email at any time.</p>

            <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClasses} htmlFor="firstName">
                    First name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    className={inputClasses}
                    value={form.firstName}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className={labelClasses} htmlFor="lastName">
                    Last name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    className={inputClasses}
                    value={form.lastName}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label className={labelClasses} htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className={inputClasses}
                  value={form.email}
                  onChange={handleChange}
                />
              </div>

              {savedMessage && (
                <p className="text-sm font-medium text-status-green" role="status">
                  {savedMessage}
                </p>
              )}
              {errorMessage && (
                <p className="text-sm font-medium text-status-red" role="alert">
                  {errorMessage}
                </p>
              )}

              <button type="submit" disabled={isSubmitting} className={primaryButtonClasses}>
                {isSubmitting ? "Saving..." : "Save Profile"}
              </button>
            </form>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-slate-900">Change Password</h2>
            <p className="mt-1 text-sm text-slate-500">Enter your current password and choose a new one.</p>

            <form onSubmit={handlePasswordSubmit} noValidate className="mt-4 space-y-4">
              <div>
                <label className={labelClasses} htmlFor="currentPassword">
                  Current Password
                </label>
                <input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                  className={inputClasses}
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                />
              </div>
              <div>
                <label className={labelClasses} htmlFor="newPassword">
                  New Password
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className={inputClasses}
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                />
              </div>
              <div>
                <label className={labelClasses} htmlFor="confirmNewPassword">
                  Confirm New Password
                </label>
                <input
                  id="confirmNewPassword"
                  name="confirmNewPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className={inputClasses}
                  value={passwordForm.confirmNewPassword}
                  onChange={handlePasswordChange}
                />
              </div>

              {passwordSaved && (
                <p className="text-sm font-medium text-status-green" role="status">
                  {passwordSaved}
                </p>
              )}
              {passwordError && (
                <p className="text-sm font-medium text-status-red" role="alert">
                  {passwordError}
                </p>
              )}

              <button type="submit" disabled={isChangingPassword} className={primaryButtonClasses}>
                {isChangingPassword ? "Changing password..." : "Change Password"}
              </button>
            </form>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
