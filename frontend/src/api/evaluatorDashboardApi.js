import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

export async function getEvaluatorDashboard() {
  const response = await fetch(`${API_BASE_URL}/api/evaluator/dashboard`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, null, "Failed to load dashboard."), response.status);
  }

  return response.json();
}
