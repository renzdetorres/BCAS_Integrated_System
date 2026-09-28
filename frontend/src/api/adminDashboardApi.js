import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

export async function getAdminDashboard() {
  const response = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
    method: "GET",
    credentials: "include",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, data, "Failed to load dashboard."), response.status);
  }

  return data;
}
