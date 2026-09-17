import { API_BASE_URL, ApiError, extractErrorMessage } from "./apiClient.js";

export async function getMyExamPermit() {
  const response = await fetch(`${API_BASE_URL}/api/exam-permit`, {
    method: "GET",
    credentials: "include",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extractErrorMessage(data) ?? "Failed to load your exam permit.";
    throw new ApiError(message, response.status);
  }

  return data;
}

export async function getMyRescheduleRequest() {
  const response = await fetch(`${API_BASE_URL}/api/exam-permit/reschedule-request`, {
    method: "GET",
    credentials: "include",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new ApiError("Failed to load your reschedule request.", response.status);
  }

  return response.json();
}

export async function submitRescheduleRequest(reason) {
  const response = await fetch(`${API_BASE_URL}/api/exam-permit/reschedule-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ reason }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extractErrorMessage(data) ?? "Failed to submit reschedule request. Please try again.";
    throw new ApiError(message, response.status);
  }

  return data;
}
