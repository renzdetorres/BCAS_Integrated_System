import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

const BASE = `${API_BASE_URL}/api/admin/exam-schedules`;

async function send(path, method, body, fallback) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, data, fallback), response.status);
  }

  return data;
}

const seatsOrNull = (capacity) => (capacity === "" || capacity == null ? null : Number(capacity));

export function listExamSchedules() {
  return send("", "GET", undefined, "Failed to load exam schedules.");
}

/** Adds a time slot to a date. Times are Philippine time. */
export function createExamSchedule({ examDate, examTime, isOffered = true, capacity }) {
  return send("", "POST", { examDate, examTime, isOffered, capacity: seatsOrNull(capacity) }, "Failed to add the time slot. Please try again.");
}

/** Changes a slot's time and seats. */
export function updateExamSchedule(examScheduleId, { examTime, capacity }) {
  return send(`/${examScheduleId}`, "PUT", { examTime, capacity: seatsOrNull(capacity) }, "Failed to update the time slot. Please try again.");
}

export function deleteExamSchedule(examScheduleId) {
  return send(`/${examScheduleId}`, "DELETE", undefined, "Failed to remove the time slot. Please try again.");
}

export function setExamScheduleOffered(examScheduleId, isOffered) {
  return send(`/${examScheduleId}/offered`, "PATCH", { isOffered }, "Failed to update the exam schedule. Please try again.");
}

/** Offers or withdraws every slot on a date ("yyyy-mm-dd"). */
export function setExamDateOffered(examDate, isOffered) {
  return send(`/dates/${examDate}/offered`, "PATCH", { isOffered }, "Failed to update the exam date. Please try again.");
}

export const EXAM_STATUSES = [
  { value: "Scheduled", label: "Scheduled" },
  { value: "ExamDone", label: "Exam Done" },
  { value: "Rescheduled", label: "Rescheduled" },
  { value: "DidNotTakeExam", label: "Did Not Take Exam" },
];

export async function setApplicantExamStatus(userId, status) {
  await send(`/applicants/${userId}/status`, "PATCH", { status }, "Failed to update the exam status.");
}
