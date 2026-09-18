import { API_BASE_URL, ApiError, extractErrorMessage } from "./apiClient.js";

export async function getMyAcademicHeadProfile() {
  const response = await fetch(`${API_BASE_URL}/api/academic-head/settings`, {
    method: "GET",
    credentials: "include",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extractErrorMessage(data) ?? "Failed to load your profile.";
    throw new ApiError(message, response.status);
  }

  return data;
}

export async function updateMyAcademicHeadProfile({ firstName, lastName, email }) {
  const response = await fetch(`${API_BASE_URL}/api/academic-head/settings/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ firstName, lastName, email }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extractErrorMessage(data) ?? "Failed to save profile. Please try again.";
    throw new ApiError(message, response.status);
  }

  return data;
}

export async function changeMyAcademicHeadPassword({ currentPassword, newPassword }) {
  const response = await fetch(`${API_BASE_URL}/api/academic-head/settings/password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  if (response.status === 204) {
    return;
  }

  const data = await response.json().catch(() => null);
  const message = extractErrorMessage(data) ?? "Failed to change password. Please try again.";
  throw new ApiError(message, response.status);
}
