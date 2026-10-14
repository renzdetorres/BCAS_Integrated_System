import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

async function read(pending, fallback) {
  const response = await pending;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, data, fallback), response.status);
  }
  return data;
}

const get = { method: "GET", credentials: "include" };
const post = (body) => ({ method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });

function query(params) {
  const usp = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value) usp.set(key, value);
  });
  const text = usp.toString();
  return text ? `?${text}` : "";
}

export const getScholarshipSummary = (academicYear) =>
  read(fetch(`${API_BASE_URL}/api/staff/scholarship-pipeline/summary${query({ academicYear })}`, get), "Failed to load the scholarship summary.");

export const getScholarshipApplicants = () =>
  read(fetch(`${API_BASE_URL}/api/staff/scholarship-pipeline/applicants`, get), "Failed to load scholarship applicants.");

export const getTopGrantees = (filters) =>
  read(fetch(`${API_BASE_URL}/api/staff/scholarship-pipeline/grantees${query(filters)}`, get), "Failed to load the grantees.");

export const recordScholarshipExamResult = (applicationId, { result, score, remarks }) =>
  read(
    fetch(
      `${API_BASE_URL}/api/staff/scholarship-pipeline/${applicationId}/exam-result`,
      post({ result, score: score === "" || score == null ? null : Number(score), remarks: remarks || null })
    ),
    "Failed to record the scholarship exam result."
  );

export const recordScholarshipInterview = (applicationId, { interviewScore, essayScore, notes }) => {
  const num = (v) => (v === "" || v == null ? null : Number(v));
  return read(
    fetch(
      `${API_BASE_URL}/api/staff/scholarship-pipeline/${applicationId}/interview`,
      post({ interviewScore: num(interviewScore), essayScore: num(essayScore), notes: notes || null })
    ),
    "Failed to record the interview and essay scores."
  );
};
