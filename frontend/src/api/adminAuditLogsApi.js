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
