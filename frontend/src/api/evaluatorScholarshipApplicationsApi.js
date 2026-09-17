import { API_BASE_URL, ApiError, extractErrorMessage } from "./apiClient.js";

export const SCREENING_VERDICTS = [
  { value: "Qualified", label: "Qualified" },
  { value: "NotQualified", label: "Not Qualified" },
];

export async function getScholarshipApplicationDetail(applicationId) {
  const response = await fetch(`${API_BASE_URL}/api/evaluator/scholarship-applications/${applicationId}`, {
    method: "GET",
    credentials: "include",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extractErrorMessage(data) ?? "Failed to load application.";
    throw new ApiError(message, response.status);
  }

  return data;
}

export async function recordScholarshipScreening(applicationId, { verdict, remarks }) {
  const response = await fetch(
    `${API_BASE_URL}/api/evaluator/scholarship-applications/${applicationId}/screening`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ verdict, remarks }),
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extractErrorMessage(data) ?? "Failed to save the screening verdict. Please try again.";
    throw new ApiError(message, response.status);
  }

  return data;
}

export async function advanceScholarshipApplicationWorkflow(applicationId) {
  const response = await fetch(
    `${API_BASE_URL}/api/evaluator/scholarship-applications/${applicationId}/advance`,
    {
      method: "POST",
      credentials: "include",
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extractErrorMessage(data) ?? "Failed to advance the application. Please try again.";
    throw new ApiError(message, response.status);
  }

  return data;
}
