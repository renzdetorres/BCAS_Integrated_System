import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";
import { uploadWithProgress } from "./uploadWithProgress.js";

export const DOCUMENT_TYPE_LABELS = {
  ReportCard: "Report Card",
  IdPicture: "2x2 ID Picture",
  PSA: "PSA (Birth Certificate)",
  TOR: "Transcript of Records (TOR)",
  SF10: "SF10 (Permanent Record)",
  ScholarshipForm: "Signed Scholarship Application Form",
};

export async function getMyDocumentChecklist() {
  const response = await fetch(`${API_BASE_URL}/api/documents`, {
    method: "GET",
    credentials: "include",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resolveErrorMessage(response, data, "Failed to load document checklist.");
    throw new ApiError(message, response.status);
  }

  return data;
}

export async function getMyScholarshipDocumentChecklist() {
  const response = await fetch(`${API_BASE_URL}/api/documents/scholarship`, {
    method: "GET",
    credentials: "include",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resolveErrorMessage(response, data, "Failed to load scholarship documents.");
    throw new ApiError(message, response.status);
  }

  return data;
}

/** Uploads (or replaces) one document. `onProgress(percent)` is optional and reports 0-100 as the file goes up. */
export async function uploadDocument(documentType, file, onProgress) {
  const formData = new FormData();
  formData.append("file", file);

  return uploadWithProgress(`/api/documents/${documentType}`, {
    method: "PUT",
    body: formData,
    onProgress,
    fallback: "Failed to upload document. Please try again.",
  });
}

/** The signed-in applicant's own uploaded file as a Blob, for the in-page preview (fetched with the auth cookie, never linked directly). */
export async function getMyDocumentFile(documentType) {
  const response = await fetch(`${API_BASE_URL}/api/documents/${encodeURIComponent(documentType)}/file`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, null, "Failed to load this file."), response.status);
  }

  return response.blob();
}
