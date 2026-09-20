import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

export async function getSupportStaffDashboard() {
  const response = await fetch(`${API_BASE_URL}/api/support-staff/dashboard`, {
    method: "GET",
    credentials: "include",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resolveErrorMessage(response, data, "Failed to load dashboard.");
    throw new ApiError(message, response.status);
  }

  return data;
}
