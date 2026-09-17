import { API_BASE_URL, ApiError } from "./apiClient.js";

export async function getUpcomingDeadlines() {
  const response = await fetch(`${API_BASE_URL}/api/dashboard/deadlines`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError("Failed to load deadlines.", response.status);
  }

  return response.json();
}
