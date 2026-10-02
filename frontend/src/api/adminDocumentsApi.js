import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

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
    throw new ApiError(resolveErrorMessage(response, null, "Failed to load documents."), response.status);
  }

  return response.json();
}

/**
 * One document's uploaded file as a Blob, for the in-page preview. Fetched
 * with credentials (the auth cookie) rather than linked directly, so the
 * file never needs a public URL.
 */
export async function getDocumentFile(documentId) {
  const response = await fetch(`${API_BASE_URL}/api/admin/documents/${documentId}/file`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, null, "Failed to load this file."), response.status);
  }

  return response.blob();
}
