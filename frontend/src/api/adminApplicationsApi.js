import { API_BASE_URL, ApiError } from "./apiClient.js";

export async function searchApplications({ search, status, category, program } = {}) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  if (category) params.set("category", category);
  if (program) params.set("program", program);

  const query = params.toString();
  const response = await fetch(`${API_BASE_URL}/api/admin/applications${query ? `?${query}` : ""}`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError("Failed to load applications.", response.status);
  }

  return response.json();
}
