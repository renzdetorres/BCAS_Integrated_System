import { useCallback, useEffect, useMemo, useState } from "react";
import { listNotificationTriggers, setNotificationTriggerEnabled } from "../api/notificationSettingsApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import SettingsSearch from "../components/ui/SettingsSearch.jsx";
import "./NotificationSettingsPage.css";
import Skeleton from "../components/ui/Skeleton.jsx";

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

  const searchEntries = useMemo(
    () =>
      triggers.map((trigger) => ({
        id: `trigger-${trigger.triggerKey}`,
        label: trigger.displayName,
        hint: trigger.description,
        keywords: "email notification on off turn",
      })),
    [triggers],
  );

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
    <AppLayout title="Notification Settings">
      <SettingsSearch entries={searchEntries} placeholder="Search notifications" />

      <Card>
        <p className="notification-settings-subtitle">
          Turn system-triggered email notifications on or off. A change here applies starting with the
          next notification event of that kind.
        </p>

        {errorMessage && (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        )}

        {isLoading ? (
          <Skeleton variant="table" />
        ) : (
          <ul className="notification-trigger-list">
            {triggers.map((trigger) => (
              <li key={trigger.triggerKey} id={`trigger-${trigger.triggerKey}`} className="notification-trigger-row">
                <div className="notification-trigger-info">
                  <span className="notification-trigger-name">{trigger.displayName}</span>
                  <p className="notification-trigger-description">{trigger.description}</p>
                  <span className="notification-trigger-updated">
                    Last updated {formatDateTime(trigger.updatedAt)}
                  </span>
                </div>
                <button
                  type="button"
                  className={trigger.isEnabled ? "trigger-toggle-on" : "trigger-toggle-off"}
                  onClick={() => handleToggle(trigger)}
                  disabled={pendingTriggerKey === trigger.triggerKey}
                  role="switch"
                  aria-checked={trigger.isEnabled}
                >
                  {pendingTriggerKey === trigger.triggerKey ? "Saving..." : trigger.isEnabled ? "On" : "Off"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AppLayout>
  );
}
