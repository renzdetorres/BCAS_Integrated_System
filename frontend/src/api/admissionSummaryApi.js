import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

/** The admission dashboard figures and five-year trend, for one academic year or all of them. */
export async function getAdmissionSummary(academicYear) {
  const query = academicYear ? `?academicYear=${encodeURIComponent(academicYear)}` : "";
  const response = await fetch(`${API_BASE_URL}/api/admin/admission-summary${query}`, { method: "GET", credentials: "include" });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, data, "Failed to load the admission summary."), response.status);
  }

  return data;
}
