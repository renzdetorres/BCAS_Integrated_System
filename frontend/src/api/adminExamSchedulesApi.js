import { API_BASE_URL, ApiError, extractErrorMessage } from "./apiClient.js";

export const DAY_TYPES = ["Saturday", "Weekday"];

export async function listExamSchedules() {
  const response = await fetch(`${API_BASE_URL}/api/admin/exam-schedules`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError("Failed to load exam schedules.", response.status);
  }

  return response.json();
}

export async function createExamSchedule({ dayType, examDate, examTime, venue, isOffered }) {
  const response = await fetch(`${API_BASE_URL}/api/admin/exam-schedules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ dayType, examDate, examTime, venue, isOffered }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extractErrorMessage(data) ?? "Failed to create the exam schedule. Please try again.";
    throw new ApiError(message, response.status);
  }

  return data;
}

export async function setExamScheduleOffered(examScheduleId, isOffered) {
  const response = await fetch(`${API_BASE_URL}/api/admin/exam-schedules/${examScheduleId}/offered`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ isOffered }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extractErrorMessage(data) ?? "Failed to update the exam schedule. Please try again.";
    throw new ApiError(message, response.status);
  }

  return data;
}
