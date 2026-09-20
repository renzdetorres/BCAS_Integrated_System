import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

export async function searchApplicants({ search } = {}) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  const query = params.toString();

  const response = await fetch(`${API_BASE_URL}/api/support-staff/applicants${query ? `?${query}` : ""}`, {
    method: "GET",
    credentials: "include",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resolveErrorMessage(response, data, "Failed to load applicant records.");
    throw new ApiError(message, response.status);
  }

  return data;
}
