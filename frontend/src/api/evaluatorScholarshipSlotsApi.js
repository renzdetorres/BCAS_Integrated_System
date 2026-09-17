import { API_BASE_URL, ApiError } from "./apiClient.js";

export async function getScholarshipSlots() {
  const response = await fetch(`${API_BASE_URL}/api/evaluator/scholarship-slots`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError("Failed to load scholarship slots.", response.status);
  }

  return response.json();
}
