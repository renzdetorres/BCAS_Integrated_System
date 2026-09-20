import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

export async function getAvailableScholarships() {
  const response = await fetch(`${API_BASE_URL}/api/scholarships`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, null, "Failed to load scholarships."), response.status);
  }

  return response.json();
}

export async function getMyScholarshipApplications() {
  const response = await fetch(`${API_BASE_URL}/api/scholarship-applications`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, null, "Failed to load applications."), response.status);
  }

  return response.json();
}

export async function submitScholarshipApplication({ scholarshipId, gradeAverage }) {
  const response = await fetch(`${API_BASE_URL}/api/scholarship-applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ scholarshipId, gradeAverage }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resolveErrorMessage(response, data, "Failed to submit application. Please try again.");
    throw new ApiError(message, response.status);
  }

  return data;
}
