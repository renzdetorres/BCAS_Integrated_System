import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

/** Staff: sends one applicant a system notification and an email. */
export async function sendStaffNotification({ userId, subject, message }) {
  const response = await fetch(`${API_BASE_URL}/api/staff/notifications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ userId, subject, message }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(resolveErrorMessage(response, data, "Failed to send the notification. Please try again."), response.status);
  }
}
