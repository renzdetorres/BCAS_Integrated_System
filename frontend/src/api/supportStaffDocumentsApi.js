import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

export const DOCUMENT_TYPES = ["ReportCard", "IdPicture", "PSA", "TOR", "SF10", "ScholarshipForm"];

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

/** Every active document in any status; the queue lists the approved and rejected ones after the open ones. */
export async function listAllDocuments() {
  const response = await fetch(`${API_BASE_URL}/api/support-staff/documents?includeReviewed=true`, {
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

/** Takes one archived document out of the archive; it goes back to the verification queue. */
export async function restoreArchivedDocument(documentId) {
  const response = await fetch(`${API_BASE_URL}/api/support-staff/documents/${documentId}/restore`, {
    method: "POST",
    credentials: "include",
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, data, "Failed to restore the document."), response.status);
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

export async function bulkReviewDocuments(documentIds, { status, reason }) {
  const response = await fetch(`${API_BASE_URL}/api/support-staff/documents/bulk-review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ documentIds, status, reason: reason || null }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resolveErrorMessage(response, data, "Failed to review the selected documents. Please try again.");
    throw new ApiError(message, response.status);
  }

  return data;
}

/** One document's uploaded file as a Blob, for the in-page preview (fetched with the auth cookie, never linked directly). */
export async function getDocumentFileForReview(documentId) {
  const response = await fetch(`${API_BASE_URL}/api/support-staff/documents/${documentId}/file`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, null, "Failed to load this file."), response.status);
  }

  return response.blob();
}
