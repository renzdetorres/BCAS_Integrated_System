import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

/** Everything the Analytics page draws, for one academic year or all of them. */
export async function getAdmissionAnalytics(academicYear) {
  const query = academicYear ? `?academicYear=${encodeURIComponent(academicYear)}` : "";
  const response = await fetch(`${API_BASE_URL}/api/admin/analytics${query}`, { method: "GET", credentials: "include" });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, data, "Failed to load the analytics."), response.status);
  }

  return data;
}
