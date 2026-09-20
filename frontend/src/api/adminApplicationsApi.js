import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

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

// Admission's ordered workflow (BISAASS-56) - kept in sync with the
// backend's AdmissionWorkflowConstants. Approved and Rejected share a rank
// (both terminal, neither leads anywhere else).
const ADMISSION_STAGE_RANK = { Submitted: 0, UnderReview: 1, Approved: 2, Rejected: 2 };

// Every Admission status that's a valid forward move from currentStatus -
// empty once a decision (Approved/Rejected) has been recorded, since the
// workflow never changes after that.
export function getValidNextAdmissionStatuses(currentStatus) {
  const currentRank = ADMISSION_STAGE_RANK[currentStatus] ?? 0;
  if (currentRank >= 2) return [];
  return ADMISSION_STATUSES.filter((status) => ADMISSION_STAGE_RANK[status] > currentRank);
}

// Scholarship's ordered workflow (BISAASS-57) - kept in sync with the
// backend's ScholarshipWorkflowConstants. Approved and Rejected share a
// rank (both terminal, neither leads anywhere else).
const SCHOLARSHIP_STAGE_RANK = {
  Submitted: 0,
  DocumentsVerified: 1,
  EligibilityScreening: 2,
  Evaluation: 3,
  Result: 4,
  Approved: 5,
  Rejected: 5,
};

// Every Scholarship status that's a valid forward move from currentStatus -
// empty once a decision (Approved/Rejected) has been recorded, since the
// workflow never changes after that.
export function getValidNextScholarshipStatuses(currentStatus) {
  const currentRank = SCHOLARSHIP_STAGE_RANK[currentStatus] ?? 0;
  if (currentRank >= 5) return [];
  return SCHOLARSHIP_STATUSES.filter((status) => SCHOLARSHIP_STAGE_RANK[status] > currentRank);
}

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
    throw new ApiError(resolveErrorMessage(response, null, "Failed to load applications."), response.status);
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
    const message = resolveErrorMessage(response, data, "Failed to update the application's status. Please try again.");
    throw new ApiError(message, response.status);
  }

  return data;
}

export async function getApplicationStatusHistory(applicationId, category) {
  const params = new URLSearchParams({ category });
  const response = await fetch(`${API_BASE_URL}/api/admin/applications/${applicationId}/status-history?${params}`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, null, "Failed to load this application's status history."), response.status);
  }

  return response.json();
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
    const message = resolveErrorMessage(response, data, "Failed to archive this application. Please try again.");
    throw new ApiError(message, response.status);
  }

  return data;
}
