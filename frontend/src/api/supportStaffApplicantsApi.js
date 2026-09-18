import { API_BASE_URL, ApiError, extractErrorMessage } from "./apiClient.js";

export async function listApplicants() {
  const response = await fetch(`${API_BASE_URL}/api/support-staff/applicants`, {
    method: "GET",
    credentials: "include",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extractErrorMessage(data) ?? "Failed to load applicant records.";
    throw new ApiError(message, response.status);
  }

  return data;
}
