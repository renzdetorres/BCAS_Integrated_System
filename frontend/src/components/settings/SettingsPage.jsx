import { useState } from "react";
import AppShell from "../layout/AppShell.jsx";
import Card from "../ui/Card.jsx";
import Toggle from "../ui/Toggle.jsx";
import { inputClasses, labelClasses, primaryButtonClasses } from "../../lib/formStyles.js";
import { changeMyAccountPassword } from "../../api/accountApi.js";
import { useSession } from "../../context/SessionContext.jsx";
import { ApiError } from "../../api/apiClient.js";

const initialPasswordForm = { currentPassword: "", newPassword: "", confirmNewPassword: "" };

function prefsKey(email) {
  return `bcas.notificationPrefs.${email ?? "anon"}`;
}

function loadPrefs(email) {
  try {
    const raw = localStorage.getItem(prefsKey(email));
    if (!raw) return { emailNotifications: true, smsNotifications: false, language: "English" };
    return JSON.parse(raw);
  } catch {
    return { emailNotifications: true, smsNotifications: false, language: "English" };
  }
}

/**
 * Shared "Settings" screen reused across every role (BCAS-24). Notification
 * preferences have no backend yet, so they're persisted per-user in
 * localStorage rather than faked as a server round-trip. `changePassword`
 * defaults to the generic /api/account/password endpoint - pass a
 * role-specific function to preserve an existing dedicated one.
 */
export default function SettingsPage({ changePassword = changeMyAccountPassword }) {
  const { session } = useSession();
  const [prefs, setPrefs] = useState(() => loadPrefs(session?.email));
  const [prefsSaved, setPrefsSaved] = useState(null);

  const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSaved, setPasswordSaved] = useState(null);

  function handleSavePrefs(event) {
    event.preventDefault();
    localStorage.setItem(prefsKey(session?.email), JSON.stringify(prefs));
    setPrefsSaved("Preferences saved.");
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
      await changePassword({
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

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-bold text-slate-900">Notifications</h2>
          <form onSubmit={handleSavePrefs} className="mt-4 space-y-1">
            <Toggle
              label="Email Notifications"
              checked={prefs.emailNotifications}
              onChange={(value) => setPrefs((prev) => ({ ...prev, emailNotifications: value }))}
            />
            <Toggle
              label="SMS Notifications"
              checked={prefs.smsNotifications}
              onChange={(value) => setPrefs((prev) => ({ ...prev, smsNotifications: value }))}
            />

            <div className="pt-3">
              <label className={labelClasses} htmlFor="language">
                Language
              </label>
              <select
                id="language"
                className={inputClasses}
                value={prefs.language}
                onChange={(event) => setPrefs((prev) => ({ ...prev, language: event.target.value }))}
              >
                <option value="English">English</option>
              </select>
            </div>

            {prefsSaved && (
              <p className="pt-2 text-sm font-medium text-status-green" role="status">
                {prefsSaved}
              </p>
            )}

            <button type="submit" className={`${primaryButtonClasses} mt-4`}>
              Save Preferences
            </button>
          </form>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-slate-900">Change Password</h2>
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
    </AppShell>
  );
}
