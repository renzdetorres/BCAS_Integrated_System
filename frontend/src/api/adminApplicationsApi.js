import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

export const ADMISSION_STATUSES = [
  "Submitted",
  "UnderReview",
  "PendingDocuments",
  "DocumentsCompleted",
  "DocumentsCleared",
  "ExamScheduled",
  "ExamDone",
  "DidNotTakeExam",
  "Registration",
  "Approved",
  "Rejected",
  "Retracted",
];

export const SCHOLARSHIP_STATUSES = [
  "Waitlisted",
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
export const ARCHIVABLE_STATUSES = ["Approved", "Rejected", "Retracted"];

// Admission's ordered workflow - kept in sync with the backend's
// AdmissionWorkflowConstants. The main path moves one step at a time;
// Rejected and Retracted are open until the application is final;
// DidNotTakeExam branches off ExamScheduled and can return to it.
export const ADMISSION_PATH = [
  "Submitted",
  "UnderReview",
  "PendingDocuments",
  "DocumentsCompleted",
  "DocumentsCleared",
  "ExamScheduled",
  "ExamDone",
  "Registration",
  "Approved",
];
const ADMISSION_FINAL = new Set(["Approved", "Rejected", "Retracted"]);

// Every Admission status that's a valid forward move from currentStatus -
// empty once a decision (Approved/Rejected) has been recorded, since the
// workflow never changes after that.
export function getValidNextAdmissionStatuses(currentStatus) {
  if (ADMISSION_FINAL.has(currentStatus)) return [];
  const index = ADMISSION_PATH.indexOf(currentStatus);
  const next = [];
  if (index >= 0) {
    next.push(ADMISSION_PATH[index + 1]);
    if (currentStatus === "ExamScheduled") next.push("DidNotTakeExam");
  } else if (currentStatus === "DidNotTakeExam") {
    next.push("ExamScheduled");
  } else {
    return [];
  }
  return [...next, "Rejected", "Retracted"];
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
// workflow never changes after that. "Waitlisted" is deliberately absent
// from SCHOLARSHIP_STAGE_RANK (mirroring the backend's
// ScholarshipWorkflowConstants), so it needs its own guard here too -
// without it the `?? 0` fallback below would offer every forward status as
// a "valid" generic transition, when the only real way out of Waitlisted
// is the dedicated promote-from-waitlist action (reserves a slot; this
// generic status endpoint doesn't).
export function getValidNextScholarshipStatuses(currentStatus) {
  if (currentStatus === "Waitlisted") return [];
  const currentRank = SCHOLARSHIP_STAGE_RANK[currentStatus] ?? 0;
  if (currentRank >= 5) return [];
  return SCHOLARSHIP_STATUSES.filter((status) => SCHOLARSHIP_STAGE_RANK[status] > currentRank);
}

export async function searchApplications({ search, status, category, program, archived, department } = {}) {
  const params = new URLSearchParams();
  if (department) params.set("department", department);
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

/**
 * Files an admission application under a department - which decides the
 * Academic Head who sees this applicant (and their scholarship
 * applications). Admission applications only; a scholarship application
 * follows its applicant's admission application.
 */
export async function setApplicationDepartment(applicationId, department, program) {
  const response = await fetch(`${API_BASE_URL}/api/admin/applications/${applicationId}/department`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ department, program: program || null }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resolveErrorMessage(response, data, "Failed to update the department. Please try again.");
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

/** The entrance-exam application form of an admission application. */
export async function getEntranceForm(applicationId) {
  const response = await fetch(`${API_BASE_URL}/api/admin/applications/${applicationId}/entrance-form`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, null, "Failed to load the application form."), response.status);
  }

  return response.json();
}

/** The application's log, newest first: submission, status changes, document reviews and exam events. */
export async function getApplicationLogs(applicationId, category) {
  const params = new URLSearchParams({ category });
  const response = await fetch(`${API_BASE_URL}/api/admin/applications/${applicationId}/logs?${params}`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, null, "Failed to load this application's logs."), response.status);
  }

  return response.json();
}

export async function promoteFromWaitlist(applicationId) {
  const response = await fetch(`${API_BASE_URL}/api/admin/applications/${applicationId}/promote-from-waitlist`, {
    method: "POST",
    credentials: "include",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resolveErrorMessage(response, data, "Failed to promote this application from the waitlist. Please try again.");
    throw new ApiError(message, response.status);
  }

  return data;
}

export async function bulkArchiveApplications(items, reason) {
  const response = await fetch(`${API_BASE_URL}/api/admin/applications/bulk-archive`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ items, reason: reason || null }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resolveErrorMessage(response, data, "Failed to archive the selected applications. Please try again.");
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
    const message = resolveErrorMessage(response, data, "Failed to archive this application. Please try again.");
    throw new ApiError(message, response.status);
  }

  return data;
}
