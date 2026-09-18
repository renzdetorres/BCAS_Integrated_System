import { API_BASE_URL, ApiError, extractErrorMessage } from "./apiClient.js";

export async function listPendingAndFlaggedDocuments() {
  const response = await fetch(`${API_BASE_URL}/api/support-staff/documents`, {
    method: "GET",
    credentials: "include",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extractErrorMessage(data) ?? "Failed to load documents.";
    throw new ApiError(message, response.status);
  }

  return data;
}

export async function reviewDocument(documentId, { status, reason }) {
  const response = await fetch(`${API_BASE_URL}/api/support-staff/documents/${documentId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ status, reason: reason || null }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extractErrorMessage(data) ?? "Failed to review the document. Please try again.";
    throw new ApiError(message, response.status);
  }

  return data;
}
