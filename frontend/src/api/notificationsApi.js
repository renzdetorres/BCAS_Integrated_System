import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

/** The applicant's newest in-app notifications and how many are unread. */
export async function getNotifications() {
  const response = await fetch(`${API_BASE_URL}/api/notifications`, { method: "GET", credentials: "include" });

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, null, "Failed to load notifications."), response.status);
  }

  return response.json();
}

export async function markNotificationRead(notificationId) {
  await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, { method: "POST", credentials: "include" });
}

export async function markAllNotificationsRead() {
  await fetch(`${API_BASE_URL}/api/notifications/read-all`, { method: "POST", credentials: "include" });
}
