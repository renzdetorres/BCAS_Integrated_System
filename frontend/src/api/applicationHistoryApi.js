import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

export async function getMyApplicationHistory() {
  const response = await fetch(`${API_BASE_URL}/api/applications/history`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, null, "Failed to load application history."), response.status);
  }

  return response.json();
}
