import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

/** Admin: is outgoing email set up, and what is still missing? (The mail password is never returned.) */
export async function getEmailStatus() {
  const response = await fetch(`${API_BASE_URL}/api/admin/email/status`, { method: "GET", credentials: "include" });

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, null, "Failed to check the email settings."), response.status);
  }

  return response.json();
}

/** Admin: sends a test email to the signed-in admin and resolves on success; throws with the mail server's reason otherwise. */
export async function sendTestEmail() {
  const response = await fetch(`${API_BASE_URL}/api/admin/email/test`, { method: "POST", credentials: "include" });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(resolveErrorMessage(response, data, "The test email couldn't be sent."), response.status);
  }
}
