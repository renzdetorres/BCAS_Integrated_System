import { API_BASE_URL, ApiError, extractErrorMessage } from "./apiClient.js";

export const DOCUMENT_TYPE_LABELS = {
  ReportCard: "Report Card",
  IdPicture: "2x2 ID Picture",
  PSA: "PSA (Birth Certificate)",
  TOR: "Transcript of Records (TOR)",
  SF10: "SF10 (Permanent Record)",
};

export async function getMyDocumentChecklist() {
  const response = await fetch(`${API_BASE_URL}/api/documents`, {
    method: "GET",
    credentials: "include",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extractErrorMessage(data) ?? "Failed to load document checklist.";
    throw new ApiError(message, response.status);
  }

  return data;
}

export async function uploadDocument(documentType, file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/documents/${documentType}`, {
    method: "PUT",
    credentials: "include",
    body: formData,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extractErrorMessage(data) ?? "Failed to upload document. Please try again.";
    throw new ApiError(message, response.status);
  }

  return data;
}
