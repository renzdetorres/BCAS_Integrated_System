import { API_BASE_URL, ApiError, extractErrorMessage } from "./apiClient.js";

export const STAFF_ROLES = ["Evaluator", "SupportStaff", "AcademicHead", "Admin"];

export async function provisionStaff({ firstName, lastName, email, password, role }) {
  const response = await fetch(`${API_BASE_URL}/api/admin/staff`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Required so the browser sends the HttpOnly auth cookie for the
    // server-side Admin role check.
    credentials: "include",
    body: JSON.stringify({ firstName, lastName, email, password, role }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extractErrorMessage(data) ?? "Failed to create staff account. Please try again.";
    throw new ApiError(message, response.status);
  }

  return data;
}
