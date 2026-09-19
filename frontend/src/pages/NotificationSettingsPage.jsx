import { useCallback, useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell.jsx";
import Card from "../components/ui/Card.jsx";
import Toggle from "../components/ui/Toggle.jsx";
import { listNotificationTriggers, setNotificationTriggerEnabled } from "../api/notificationSettingsApi.js";
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

export default function NotificationSettingsPage() {
  const [triggers, setTriggers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [pendingTriggerKey, setPendingTriggerKey] = useState(null);

  const loadTriggers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listNotificationTriggers();
      setTriggers(data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to load notification settings.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTriggers();
  }, [loadTriggers]);

  async function handleToggle(trigger) {
    setPendingTriggerKey(trigger.triggerKey);
    setErrorMessage(null);
    try {
      const updated = await setNotificationTriggerEnabled(trigger.triggerKey, !trigger.isEnabled);
      setTriggers((prev) => prev.map((t) => (t.triggerKey === updated.triggerKey ? updated : t)));
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to update notification trigger.");
    } finally {
      setPendingTriggerKey(null);
    }
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-extrabold text-slate-900">Notification Settings</h1>
      <p className="mt-1 text-sm text-slate-500">
        Turn system-triggered email notifications on or off. A change here applies starting with the next
        notification event of that kind.
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
            {triggers.map((trigger) => (
              <div key={trigger.triggerKey} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">{trigger.displayName}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{trigger.description}</p>
                  <p className="mt-1 text-xs text-slate-400">Last updated {formatDateTime(trigger.updatedAt)}</p>
                </div>
                <div className={pendingTriggerKey === trigger.triggerKey ? "pointer-events-none opacity-60" : ""}>
                  <Toggle checked={trigger.isEnabled} onChange={() => handleToggle(trigger)} label="" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </AppShell>
  );
}
