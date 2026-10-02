import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

export async function listScholarships() {
  const response = await fetch(`${API_BASE_URL}/api/admin/scholarships`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, null, "Failed to load scholarships."), response.status);
  }

  return response.json();
}

export async function createScholarship({ name, scholarshipType, totalSlots, minimumGradeAverage }) {
  const response = await fetch(`${API_BASE_URL}/api/admin/scholarships`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name, scholarshipType, totalSlots, minimumGradeAverage }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resolveErrorMessage(response, data, "Failed to create the scholarship. Please try again.");
    throw new ApiError(message, response.status);
  }

  return data;
}

/** `force` overrides the semester lock; the API only honours it for a Super Admin. */
export async function updateScholarship(scholarshipId, { name, scholarshipType, totalSlots, minimumGradeAverage }, { force = false } = {}) {
  const response = await fetch(`${API_BASE_URL}/api/admin/scholarships/${scholarshipId}${force ? "?force=true" : ""}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name, scholarshipType, totalSlots, minimumGradeAverage }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resolveErrorMessage(response, data, "Failed to update the scholarship. Please try again.");
    throw new ApiError(message, response.status);
  }

  return data;
}

export async function setScholarshipActiveStatus(scholarshipId, isActive, { force = false } = {}) {
  const response = await fetch(`${API_BASE_URL}/api/admin/scholarships/${scholarshipId}/status${force ? "?force=true" : ""}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ isActive }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resolveErrorMessage(response, data, "Failed to update the scholarship's status. Please try again.");
    throw new ApiError(message, response.status);
  }

  return data;
}
