import { API_BASE_URL, ApiError } from "./apiClient.js";

export const DOCUMENT_TYPES = ["ReportCard", "IdPicture", "PSA", "TOR", "SF10"];

export const DOCUMENT_STATUSES = ["Pending", "Verified", "Rejected", "Flagged"];

export async function searchDocuments({ search, status, documentType } = {}) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  if (documentType) params.set("documentType", documentType);

  const query = params.toString();
  const response = await fetch(`${API_BASE_URL}/api/admin/documents${query ? `?${query}` : ""}`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError("Failed to load documents.", response.status);
  }

  return response.json();
}
