import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

export const FINAL_DECISIONS = [
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
];

export async function getApplicationsReadyForDecision() {
  const response = await fetch(`${API_BASE_URL}/api/academic-head/scholarship-applications`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, null, "Failed to load applications."), response.status);
  }

  return response.json();
}

export async function getScholarshipApplicationDetail(applicationId) {
  const response = await fetch(
    `${API_BASE_URL}/api/academic-head/scholarship-applications/${applicationId}`,
    {
      method: "GET",
      credentials: "include",
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resolveErrorMessage(response, data, "Failed to load application.");
    throw new ApiError(message, response.status);
  }

  return data;
}

export async function recordFinalDecision(applicationId, { decision, remarks }) {
  const response = await fetch(
    `${API_BASE_URL}/api/academic-head/scholarship-applications/${applicationId}/decision`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ decision, remarks }),
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resolveErrorMessage(response, data, "Failed to record the decision. Please try again.");
    throw new ApiError(message, response.status);
  }

  return data;
}
