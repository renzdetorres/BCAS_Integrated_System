import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

export const STAFF_ROLES = ["Evaluator", "SupportStaff", "AcademicHead", "Admin"];
export const ALL_ROLES = ["Applicant", ...STAFF_ROLES];

// The department/level an Academic Head oversees - scopes which admission
// reports they can see (see AcademicHeadReportsService).
export const DEPARTMENT_OPTIONS = ["College", "Senior High School", "High School", "Elementary"];

export async function provisionStaff({ firstName, lastName, email, password, role, department }) {
  const response = await fetch(`${API_BASE_URL}/api/admin/staff`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Required so the browser sends the HttpOnly auth cookie for the
    // server-side Admin role check.
    credentials: "include",
    body: JSON.stringify({ firstName, lastName, email, password, role, department: department || null }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resolveErrorMessage(response, data, "Failed to create staff account. Please try again.");
    throw new ApiError(message, response.status);
  }

  return data;
}

export async function listUsers() {
  const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, null, "Failed to load accounts."), response.status);
  }

  return response.json();
}

export async function updateUser(userId, { firstName, lastName, email, role, department }) {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ firstName, lastName, email, role, department: department || null }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resolveErrorMessage(response, data, "Failed to update account. Please try again.");
    throw new ApiError(message, response.status);
  }

  return data;
}

export async function setUserActiveStatus(userId, isActive) {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ isActive }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resolveErrorMessage(response, data, "Failed to update account status. Please try again.");
    throw new ApiError(message, response.status);
  }

  return data;
}
