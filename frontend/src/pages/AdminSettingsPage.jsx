import { useCallback, useEffect, useMemo, useState } from "react";
import { listSystemSettings, setSystemSettingEnabled } from "../api/systemSettingsApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import SemestersPanel from "../components/SemestersPanel.jsx";
import SchoolConfigPanel from "../components/SchoolConfigPanel.jsx";
import AcademicCatalogPanel from "../components/AcademicCatalogPanel.jsx";
import EmailSettingsPanel from "../components/EmailSettingsPanel.jsx";
import Card from "../components/ui/Card.jsx";
import SettingsSearch from "../components/ui/SettingsSearch.jsx";
import { ADMIN_SETTINGS_ENTRIES } from "../config/settingsSearchEntries.js";
import "./AdminSettingsPage.css";

function formatDateTime(isoDateTime) {
  return new Date(isoDateTime).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [pendingSettingKey, setPendingSettingKey] = useState(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listSystemSettings();
      setSettings(data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to load system settings.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const searchEntries = useMemo(
    () => [
      ...ADMIN_SETTINGS_ENTRIES,
      ...settings.map((setting) => ({
        id: `setting-${setting.settingKey}`,
        label: setting.displayName,
        group: "System settings",
        hint: setting.description,
        keywords: "on off toggle enable disable",
      })),
    ],
    [settings],
  );

  async function handleToggle(setting) {
    setPendingSettingKey(setting.settingKey);
    setErrorMessage(null);
    try {
      const updated = await setSystemSettingEnabled(setting.settingKey, !setting.isEnabled);
      setSettings((prev) => prev.map((s) => (s.settingKey === updated.settingKey ? updated : s)));
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to update system setting.");
    } finally {
      setPendingSettingKey(null);
    }
  }

  return (
    <AppLayout title="System Settings">
      <SettingsSearch entries={searchEntries} />

      <Card id="settings-system">
        <p className="admin-settings-subtitle">
          System-level settings for admissions and scholarships. Admin-Registrar only.
        </p>

        {errorMessage && (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        )}

        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <ul className="admin-settings-list">
            {settings.map((setting) => (
              <li key={setting.settingKey} id={`setting-${setting.settingKey}`} className="admin-settings-row">
                <div className="admin-settings-info">
                  <span className="admin-settings-name">{setting.displayName}</span>
                  <p className="admin-settings-description">{setting.description}</p>
                  <span className="admin-settings-updated">Last updated {formatDateTime(setting.updatedAt)}</span>
                </div>
                <button
                  type="button"
                  className={setting.isEnabled ? "setting-toggle-on" : "setting-toggle-off"}
                  onClick={() => handleToggle(setting)}
                  disabled={pendingSettingKey === setting.settingKey}
                  role="switch"
                  aria-checked={setting.isEnabled}
                >
                  {pendingSettingKey === setting.settingKey ? "Saving..." : setting.isEnabled ? "On" : "Off"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div id="settings-admission">
        <SchoolConfigPanel />
      </div>

      <div id="settings-catalog">
        <AcademicCatalogPanel />
      </div>

      <div id="settings-email">
        <EmailSettingsPanel />
      </div>

      <div id="settings-semesters">
        <SemestersPanel />
      </div>
    </AppLayout>
  );
}
