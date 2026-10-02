import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

/**
 * The school calendar behind the scholarship lock: every semester, the one
 * in progress today (`ongoing`, or null), and whether the signed-in Admin
 * is a Super Admin (`callerIsSuperAdmin`).
 */
export async function getSemesterOverview() {
  const response = await fetch(`${API_BASE_URL}/api/admin/semesters`, { method: "GET", credentials: "include" });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, data, "Failed to load semesters."), response.status);
  }
  return data;
}

/** Super Admin only. */
export async function createSemester({ name, startDate, endDate }) {
  const response = await fetch(`${API_BASE_URL}/api/admin/semesters`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name, startDate, endDate }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, data, "Failed to add the semester."), response.status);
  }
  return data;
}

/** Super Admin only. */
export async function deleteSemester(semesterId) {
  const response = await fetch(`${API_BASE_URL}/api/admin/semesters/${semesterId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(resolveErrorMessage(response, data, "Failed to remove the semester."), response.status);
  }
}
