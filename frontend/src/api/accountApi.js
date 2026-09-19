import { API_BASE_URL, ApiError, extractErrorMessage } from "./apiClient.js";

/** Generic change-password endpoint for roles without their own settings controller. */
export async function changeMyAccountPassword({ currentPassword, newPassword }) {
  const response = await fetch(`${API_BASE_URL}/api/account/password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  if (response.status === 204) {
    return;
  }

  const data = await response.json().catch(() => null);
  const message = extractErrorMessage(data) ?? "Failed to change password. Please try again.";
  throw new ApiError(message, response.status);
}
