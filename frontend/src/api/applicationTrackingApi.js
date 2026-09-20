import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

export async function getMyApplicationTracking() {
  const response = await fetch(`${API_BASE_URL}/api/application-tracking`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, null, "Failed to load application tracking."), response.status);
  }

  return response.json();
}
