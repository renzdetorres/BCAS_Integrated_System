import { useEffect, useMemo, useState } from "react";
import { changeMyPassword } from "../api/profileApi.js";
import { getMyNotificationPreferences, setMyNotificationPreference } from "../api/notificationPreferencesApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import SettingsSearch from "../components/ui/SettingsSearch.jsx";
import { APPLICANT_SETTINGS_ENTRIES } from "../config/settingsSearchEntries.js";
import "./ApplicantProfilePage.css";
import Skeleton from "../components/ui/Skeleton.jsx";

const SETTINGS_TABS = [
  {
    section: "Account",
    items: [{ key: "password", label: "Change Password" }],
  },
  {
    section: "Preferences",
    items: [{ key: "notifications", label: "Notification Preferences" }],
  },
];

const initialPasswordForm = { currentPassword: "", newPassword: "", confirmNewPassword: "" };

export default function ApplicantSettingsPage() {
  const [activeTab, setActiveTab] = useState("password");

  const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSaved, setPasswordSaved] = useState(null);

  const [preferences, setPreferences] = useState([]);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  const [preferencesError, setPreferencesError] = useState(null);
  const [pendingPreferenceType, setPendingPreferenceType] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getMyNotificationPreferences()
      .then((data) => {
        if (!cancelled) setPreferences(data);
      })
      .catch((error) => {
        if (!cancelled) {
          setPreferencesError(error instanceof ApiError ? error.message : "Failed to load notification preferences.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPreferences(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const searchEntries = useMemo(
    () => [
      ...APPLICANT_SETTINGS_ENTRIES,
      ...preferences.map((preference) => ({
        id: `preference-${preference.notificationType}`,
        tab: "notifications",
        label: preference.displayName,
        group: "Notification preferences",
        keywords: "email turn on off",
      })),
    ],
    [preferences],
  );

  async function handlePreferenceToggle(preference) {
    setPendingPreferenceType(preference.notificationType);
    setPreferencesError(null);
    try {
      const updated = await setMyNotificationPreference(preference.notificationType, !preference.isEnabled);
      setPreferences((prev) => prev.map((p) => (p.notificationType === updated.notificationType ? updated : p)));
    } catch (error) {
      setPreferencesError(error instanceof ApiError ? error.message : "Failed to update notification preference.");
    } finally {
      setPendingPreferenceType(null);
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
      await changeMyPassword({
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
    <AppLayout title="Settings">
      <SettingsSearch entries={searchEntries} onSelect={(entry) => entry.tab && setActiveTab(entry.tab)} />
      <div className="settings-layout">
      <nav className="settings-nav" aria-label="Settings sections">
        {SETTINGS_TABS.map((group) => (
          <div key={group.section} className="settings-nav-group">
            <div className="settings-nav-section">{group.section}</div>
            {group.items.map((item) => (
              <button
                key={item.key}
                type="button"
                className={activeTab === item.key ? "settings-nav-item active" : "settings-nav-item"}
                aria-current={activeTab === item.key ? "page" : undefined}
                onClick={() => setActiveTab(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="settings-content">
      {activeTab === "password" && (
      <Card id="settings-password" className="profile-card">
          <h2>Change Password</h2>
          <p className="profile-subtitle">Enter your current password and choose a new one.</p>

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
              <input placeholder="Enter your current password"
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
              <input placeholder="At least 8 characters"
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
              <input placeholder="Re-enter your new password"
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
      </Card>
      )}

      {activeTab === "notifications" && (
      <Card id="settings-notifications" className="profile-card">
          <h2>Notification Preferences</h2>
          <p className="profile-subtitle">
            Choose which updates you'd like emailed to you. Turning one off stops just that type of email - you can
            turn it back on anytime.
          </p>

          {preferencesError && (
            <p className="form-error" role="alert">
              {preferencesError}
            </p>
          )}

          {isLoadingPreferences ? (
            <Skeleton variant="form" />
          ) : (
            <ul className="notification-preference-list">
              {preferences.map((preference) => (
                <li key={preference.notificationType} id={`preference-${preference.notificationType}`} className="notification-preference-row">
                  <span className="notification-preference-name">{preference.displayName}</span>
                  <button
                    type="button"
                    className={preference.isEnabled ? "preference-toggle-on" : "preference-toggle-off"}
                    onClick={() => handlePreferenceToggle(preference)}
                    disabled={pendingPreferenceType === preference.notificationType}
                    role="switch"
                    aria-checked={preference.isEnabled}
                  >
                    {pendingPreferenceType === preference.notificationType
                      ? "Saving..."
                      : preference.isEnabled
                        ? "On"
                        : "Off"}
                  </button>
                </li>
              ))}
            </ul>
          )}
      </Card>
      )}
      </div>
      </div>
    </AppLayout>
  );
}
