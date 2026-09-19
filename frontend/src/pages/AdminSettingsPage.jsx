import { useCallback, useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell.jsx";
import Card from "../components/ui/Card.jsx";
import Toggle from "../components/ui/Toggle.jsx";
import { listSystemSettings, setSystemSettingEnabled } from "../api/systemSettingsApi.js";
import { ApiError } from "../api/apiClient.js";

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
    <AppShell>
      <h1 className="text-2xl font-extrabold text-slate-900">Admin Settings</h1>
      <p className="mt-1 text-sm text-slate-500">
        System-level settings for admissions and scholarships. Admin-Registrar only.
      </p>

      {errorMessage && (
        <p className="mt-4 text-sm font-medium text-status-red" role="alert">
          {errorMessage}
        </p>
      )}

      <Card className="mt-6">
        {isLoading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {settings.map((setting) => (
              <div key={setting.settingKey} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">{setting.displayName}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{setting.description}</p>
                  <p className="mt-1 text-xs text-slate-400">Last updated {formatDateTime(setting.updatedAt)}</p>
                </div>
                <div className={pendingSettingKey === setting.settingKey ? "pointer-events-none opacity-60" : ""}>
                  <Toggle checked={setting.isEnabled} onChange={() => handleToggle(setting)} label="" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </AppShell>
  );
}
