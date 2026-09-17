import { API_BASE_URL, ApiError, extractErrorMessage } from "./apiClient.js";

/** Returns the applicant's saved profile, or null if setup hasn't been completed yet. */
export async function getMyProfile() {
  const response = await fetch(`${API_BASE_URL}/api/applicant/profile`, {
    method: "GET",
    credentials: "include",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new ApiError("Failed to load profile.", response.status);
  }

  return response.json();
}

export async function saveMyProfile(profile) {
  const response = await fetch(`${API_BASE_URL}/api/applicant/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(profile),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extractErrorMessage(data) ?? "Failed to save profile. Please try again.";
    throw new ApiError(message, response.status);
  }

  return data;
}
