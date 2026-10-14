import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

/** The academic year and Pre-Kinder / Kindergarten age policy the admission form validates against. */
export async function getAdmissionConfig() {
  const response = await fetch(`${API_BASE_URL}/api/school-config/admission`, { method: "GET", credentials: "include" });

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, null, "Failed to load admission settings."), response.status);
  }

  return response.json();
}

/** Admin: every configurable value, by key. */
export async function getSchoolConfig() {
  const response = await fetch(`${API_BASE_URL}/api/admin/school-config`, { method: "GET", credentials: "include" });

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, null, "Failed to load school settings."), response.status);
  }

  return response.json();
}

/** Admin: saves the given values; resolves to every value after the save. */
export async function saveSchoolConfig(values) {
  const response = await fetch(`${API_BASE_URL}/api/admin/school-config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ values }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, data, "Failed to save settings. Please try again."), response.status);
  }

  return data;
}
