import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

export async function listNotificationTriggers() {
  const response = await fetch(`${API_BASE_URL}/api/admin/notification-settings`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, null, "Failed to load notification settings."), response.status);
  }

  return response.json();
}

export async function setNotificationTriggerEnabled(triggerKey, isEnabled) {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/notification-settings/${encodeURIComponent(triggerKey)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isEnabled }),
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resolveErrorMessage(response, data, "Failed to update notification trigger. Please try again.");
    throw new ApiError(message, response.status);
  }

  return data;
}
