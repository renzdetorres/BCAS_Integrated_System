import { API_BASE_URL, ApiError, extractErrorMessage } from "./apiClient.js";

export const ADMISSION_STATUSES = ["Submitted", "UnderReview", "Approved", "Rejected"];

export const SCHOLARSHIP_STATUSES = [
  "Submitted",
  "DocumentsVerified",
  "EligibilityScreening",
  "Evaluation",
  "Result",
  "Approved",
  "Rejected",
];

// Completed/inactive statuses eligible for archiving (BISAASS-35) - kept in
// sync with the backend's ArchiveConstants.ArchivableStatuses.
export const ARCHIVABLE_STATUSES = ["Approved", "Rejected"];

export async function searchApplications({ search, status, category, program, archived } = {}) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  if (category) params.set("category", category);
  if (program) params.set("program", program);
  if (archived !== undefined && archived !== null) params.set("archived", archived);

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

export async function updateApplicationStatus(applicationId, { category, status, remarks }) {
  const response = await fetch(`${API_BASE_URL}/api/admin/applications/${applicationId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ category, status, remarks }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extractErrorMessage(data) ?? "Failed to update the application's status. Please try again.";
    throw new ApiError(message, response.status);
  }

  return data;
}

export async function archiveApplication(applicationId, { category, reason }) {
  const response = await fetch(`${API_BASE_URL}/api/admin/applications/${applicationId}/archive`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ category, reason }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extractErrorMessage(data) ?? "Failed to archive this application. Please try again.";
    throw new ApiError(message, response.status);
  }

  return data;
}
