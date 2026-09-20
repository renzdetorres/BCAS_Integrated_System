import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

export async function getActiveAnnouncements() {
  const response = await fetch(`${API_BASE_URL}/api/announcements`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, null, "Failed to load announcements."), response.status);
  }

  return response.json();
}
