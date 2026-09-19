import { API_BASE_URL, ApiError, extractErrorMessage } from "./apiClient.js";

export async function getMyNotificationPreferences() {
  const response = await fetch(`${API_BASE_URL}/api/notification-preferences`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError("Failed to load notification preferences.", response.status);
  }

  return response.json();
}

export async function setMyNotificationPreference(notificationType, isEnabled) {
  const response = await fetch(
    `${API_BASE_URL}/api/notification-preferences/${encodeURIComponent(notificationType)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isEnabled }),
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extractErrorMessage(data) ?? "Failed to update notification preference. Please try again.";
    throw new ApiError(message, response.status);
  }

  return data;
}
