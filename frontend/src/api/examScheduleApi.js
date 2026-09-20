import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

export async function getAvailableExamSchedules() {
  const response = await fetch(`${API_BASE_URL}/api/exam-schedules`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, null, "Failed to load exam schedules."), response.status);
  }

  return response.json();
}

export async function getMyExamScheduleSelection() {
  const response = await fetch(`${API_BASE_URL}/api/exam-schedules/selection`, {
    method: "GET",
    credentials: "include",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, null, "Failed to load your exam schedule."), response.status);
  }

  return response.json();
}

export async function selectExamSchedule(examScheduleId) {
  const response = await fetch(`${API_BASE_URL}/api/exam-schedules/selection`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ examScheduleId }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resolveErrorMessage(response, data, "Failed to select exam schedule. Please try again.");
    throw new ApiError(message, response.status);
  }

  return data;
}
