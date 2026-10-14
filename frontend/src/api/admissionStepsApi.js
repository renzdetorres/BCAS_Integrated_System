import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

async function read(response, fallback) {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, data, fallback), response.status);
  }
  return data;
}

const json = (method, body) => ({
  method,
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify(body),
});

const get = { method: "GET", credentials: "include" };

// ---- Applicant ----------------------------------------------------------

export async function getMyExamResult() {
  return read(await fetch(`${API_BASE_URL}/api/exam-result`, get), "Failed to load your exam result.");
}

export async function getMyInterview() {
  return read(await fetch(`${API_BASE_URL}/api/interview`, get), "Failed to load your interview.");
}

// ---- Staff: exam results ------------------------------------------------

export const EXAM_RESULTS = ["Passed", "Failed", "Retake"];

export async function listExamResultQueue() {
  return read(await fetch(`${API_BASE_URL}/api/staff/exam-results`, get), "Failed to load exam results.");
}

export async function recordExamResult(applicationId, { result, score, remarks }) {
  return read(
    await fetch(
      `${API_BASE_URL}/api/staff/exam-results/${applicationId}`,
      json("POST", { result, score: score === "" || score == null ? null : Number(score), remarks: remarks || null })
    ),
    "Failed to record the result."
  );
}

// ---- Staff: interviews --------------------------------------------------

export async function listInterviewQueue() {
  return read(await fetch(`${API_BASE_URL}/api/staff/interviews`, get), "Failed to load interviews.");
}

export async function scheduleInterview(applicationId, { interviewDate, interviewTime, location, instructions }) {
  return read(
    await fetch(
      `${API_BASE_URL}/api/staff/interviews/${applicationId}`,
      json("PUT", { interviewDate, interviewTime, location, instructions: instructions || null })
    ),
    "Failed to schedule the interview."
  );
}

export async function evaluateInterview(applicationId, { evaluation, notes }) {
  return read(
    await fetch(
      `${API_BASE_URL}/api/staff/interviews/${applicationId}/evaluate`,
      json("POST", { evaluation, notes: notes || null })
    ),
    "Failed to record the interview result."
  );
}
