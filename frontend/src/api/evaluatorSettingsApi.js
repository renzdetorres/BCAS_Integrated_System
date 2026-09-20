import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

export async function getMyEvaluatorProfile() {
  const response = await fetch(`${API_BASE_URL}/api/evaluator/settings`, {
    method: "GET",
    credentials: "include",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resolveErrorMessage(response, data, "Failed to load your profile.");
    throw new ApiError(message, response.status);
  }

  return data;
}

export async function updateMyEvaluatorProfile({ firstName, lastName, email }) {
  const response = await fetch(`${API_BASE_URL}/api/evaluator/settings/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ firstName, lastName, email }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resolveErrorMessage(response, data, "Failed to save profile. Please try again.");
    throw new ApiError(message, response.status);
  }

  return data;
}

export async function changeMyEvaluatorPassword({ currentPassword, newPassword }) {
  const response = await fetch(`${API_BASE_URL}/api/evaluator/settings/password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  if (response.status === 204) {
    return;
  }

  const data = await response.json().catch(() => null);
  const message = resolveErrorMessage(response, data, "Failed to change password. Please try again.");
  throw new ApiError(message, response.status);
}
