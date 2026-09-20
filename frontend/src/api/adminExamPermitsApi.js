import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

export async function listExamPermits() {
  const response = await fetch(`${API_BASE_URL}/api/admin/exam-permits`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, null, "Failed to load exam permits."), response.status);
  }

  return response.json();
}

export async function releaseExamPermit(userId) {
  const response = await fetch(`${API_BASE_URL}/api/admin/exam-permits/${userId}/release`, {
    method: "POST",
    credentials: "include",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resolveErrorMessage(response, data, "Failed to release the exam permit. Please try again.");
    throw new ApiError(message, response.status);
  }

  return data;
}
