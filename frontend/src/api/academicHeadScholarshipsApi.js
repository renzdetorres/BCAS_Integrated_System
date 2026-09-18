import { API_BASE_URL, ApiError, extractErrorMessage } from "./apiClient.js";

export async function listScholarships() {
  const response = await fetch(`${API_BASE_URL}/api/academic-head/scholarships`, {
    method: "GET",
    credentials: "include",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extractErrorMessage(data) ?? "Failed to load scholarships.";
    throw new ApiError(message, response.status);
  }

  return data;
}

export async function createScholarship({ name, scholarshipType, totalSlots, minimumGradeAverage }) {
  const response = await fetch(`${API_BASE_URL}/api/academic-head/scholarships`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name, scholarshipType, totalSlots, minimumGradeAverage }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extractErrorMessage(data) ?? "Failed to create the scholarship. Please try again.";
    throw new ApiError(message, response.status);
  }

  return data;
}

export async function updateScholarship(scholarshipId, { name, scholarshipType, totalSlots, minimumGradeAverage }) {
  const response = await fetch(`${API_BASE_URL}/api/academic-head/scholarships/${scholarshipId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name, scholarshipType, totalSlots, minimumGradeAverage }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extractErrorMessage(data) ?? "Failed to update the scholarship. Please try again.";
    throw new ApiError(message, response.status);
  }

  return data;
}

export async function setScholarshipActiveStatus(scholarshipId, isActive) {
  const response = await fetch(`${API_BASE_URL}/api/academic-head/scholarships/${scholarshipId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ isActive }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extractErrorMessage(data) ?? "Failed to update the scholarship's status. Please try again.";
    throw new ApiError(message, response.status);
  }

  return data;
}
