import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

export async function getOpenDuplicateFlags() {
  const response = await fetch(`${API_BASE_URL}/api/admin/duplicate-applicants`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, null, "Failed to load duplicate-applicant flags."), response.status);
  }

  return response.json();
}

export async function resolveDuplicateFlag(flagId, { status, notes }) {
  const response = await fetch(`${API_BASE_URL}/api/admin/duplicate-applicants/${flagId}/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ status, notes: notes || null }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resolveErrorMessage(response, data, "Failed to resolve this flag. Please try again.");
    throw new ApiError(message, response.status);
  }

  return data;
}
