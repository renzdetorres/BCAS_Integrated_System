import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

export const DOCUMENT_TYPES = ["ReportCard", "IdPicture", "PSA", "TOR", "SF10"];

export async function listPendingAndFlaggedDocuments() {
  const response = await fetch(`${API_BASE_URL}/api/support-staff/documents`, {
    method: "GET",
    credentials: "include",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resolveErrorMessage(response, data, "Failed to load documents.");
    throw new ApiError(message, response.status);
  }

  return data;
}

export async function listDocumentsForApplicant(applicantUserId) {
  const response = await fetch(
    `${API_BASE_URL}/api/support-staff/documents?userId=${encodeURIComponent(applicantUserId)}`,
    {
      method: "GET",
      credentials: "include",
    },
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resolveErrorMessage(response, data, "Failed to load documents.");
    throw new ApiError(message, response.status);
  }

  return data;
}

export async function searchArchivedDocuments({ search, documentType } = {}) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (documentType) params.set("documentType", documentType);
  const query = params.toString();

  const response = await fetch(`${API_BASE_URL}/api/support-staff/documents/archive${query ? `?${query}` : ""}`, {
    method: "GET",
    credentials: "include",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resolveErrorMessage(response, data, "Failed to load the document archive.");
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
    const message = resolveErrorMessage(response, data, "Failed to review the document. Please try again.");
    throw new ApiError(message, response.status);
  }

  return data;
}
