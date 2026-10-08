import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

// Human-readable labels for the Action values AuditLogService writes -
// kept here rather than guessed from the raw string so a new action added
// on the backend just falls back to itself (still readable, just not
// specially cased) instead of breaking the page.
export const AUDIT_ACTION_LABELS = {
  Login: "Logged in",
  StaffCreated: "Created staff account",
  UserActivated: "Activated account",
  UserDeactivated: "Deactivated account",
  UserUpdated: "Updated account",
  AnnouncementCreated: "Created announcement",
  AnnouncementPosted: "Posted announcement",
  AnnouncementDeactivated: "Deactivated announcement",
  ScholarshipCreated: "Created scholarship",
  ScholarshipUpdated: "Updated scholarship",
  ScholarshipActivated: "Activated scholarship",
  ScholarshipDeactivated: "Deactivated scholarship",
  ExamScheduleCreated: "Created exam schedule",
  ExamScheduleOffered: "Marked exam schedule offered",
  ExamScheduleUnoffered: "Marked exam schedule not offered",
  ExamScheduleStatusUpdated: "Updated an applicant's exam status",
};

export async function getAuditLogs({ email, limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (email) params.set("email", email);
  params.set("limit", limit);
  params.set("offset", offset);

  const response = await fetch(`${API_BASE_URL}/api/admin/audit-logs?${params}`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, null, "Failed to load the activity log."), response.status);
  }

  return response.json();
}

// The area of the system an action belongs to, for the Module column and
// filter. An action added on the backend later falls back to "Other".
const MODULE_PREFIXES = [
  ["Login", "Sign-in"],
  ["Staff", "Accounts"],
  ["User", "Accounts"],
  ["Announcement", "Announcements"],
  ["Scholarship", "Scholarships"],
  ["ExamSchedule", "Exam schedules"],
  ["Semester", "Semesters"],
];

export function auditModule(action) {
  return MODULE_PREFIXES.find(([prefix]) => action?.startsWith(prefix))?.[1] ?? "Other";
}

/** Every entry, newest first, fetched page by page (the API caps a page at 200). */
export async function getAllAuditLogs({ maxEntries = 5000 } = {}) {
  const pageSize = 200;
  const all = [];
  while (all.length < maxEntries) {
    const page = await getAuditLogs({ limit: pageSize, offset: all.length });
    all.push(...page);
    if (page.length < pageSize) break;
  }
  return all;
}
