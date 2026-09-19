import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listNotificationTriggers, setNotificationTriggerEnabled } from "../api/notificationSettingsApi.js";
import { ApiError } from "../api/apiClient.js";
import "./NotificationSettingsPage.css";

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
    <main className="notification-settings-page">
      <div className="notification-settings-card">
        <Link className="notification-settings-back-link" to="/portal">
          &larr; Back to portal
        </Link>
        <h1>Notification Settings</h1>
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
          <p>Loading...</p>
        ) : (
          <ul className="notification-trigger-list">
            {triggers.map((trigger) => (
              <li key={trigger.triggerKey} className="notification-trigger-row">
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
      </div>
    </main>
  );
}
