import { API_BASE_URL, ApiError } from "./apiClient.js";

export async function getAdminDashboard() {
  const response = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError("Failed to load dashboard.", response.status);
  }

  return response.json();
}
