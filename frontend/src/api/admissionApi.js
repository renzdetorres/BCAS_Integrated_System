import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

export const APPLICATION_TYPES = [
  { value: "NewStudent", label: "New Student" },
  { value: "Transferee", label: "Transferee" },
];

export async function getMyAdmissionApplications() {
  const response = await fetch(`${API_BASE_URL}/api/admission-applications`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, null, "Failed to load applications."), response.status);
  }

  return response.json();
}

export async function submitAdmissionApplication({ applicationType, courseAppliedFor, previousSchool }) {
  const response = await fetch(`${API_BASE_URL}/api/admission-applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ applicationType, courseAppliedFor, previousSchool }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resolveErrorMessage(response, data, "Failed to submit application. Please try again.");
    throw new ApiError(message, response.status);
  }

  return data;
}
