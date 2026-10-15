import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

/** The dashboard figures, for one academic year (e.g. "2025-2026") or, left empty, all of them. */
export async function getAdminDashboard(academicYear) {
  const query = academicYear ? `?academicYear=${encodeURIComponent(academicYear)}` : "";
  const response = await fetch(`${API_BASE_URL}/api/admin/dashboard${query}`, {
    method: "GET",
    credentials: "include",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, data, "Failed to load dashboard."), response.status);
  }

  return data;
}
