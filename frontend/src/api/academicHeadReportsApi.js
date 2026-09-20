import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

function buildQuery(params) {
  if (!params) return "";
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") usp.set(key, value);
  });
  const query = usp.toString();
  return query ? `?${query}` : "";
}

async function getJson(path, params) {
  const response = await fetch(`${API_BASE_URL}${path}${buildQuery(params)}`, {
    method: "GET",
    credentials: "include",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resolveErrorMessage(response, data, "Failed to load this report.");
    throw new ApiError(message, response.status);
  }

  return data;
}

async function downloadFile(path, params, fallbackFileName) {
  const response = await fetch(`${API_BASE_URL}${path}${buildQuery(params)}`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message = resolveErrorMessage(response, data, "Failed to export this report.");
    throw new ApiError(message, response.status);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fallbackFileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const getEnrollmentList = (filters) => getJson("/api/academic-head/reports/admission/enrollment-list", filters);
export const exportEnrollmentList = (filters) =>
  downloadFile("/api/academic-head/reports/admission/enrollment-list/export", filters, "enrollment-list.xlsx");

export const getEnrollmentSummary = () => getJson("/api/academic-head/reports/admission/enrollment-summary");
export const exportEnrollmentSummary = () =>
  downloadFile("/api/academic-head/reports/admission/enrollment-summary/export", null, "enrollment-summary.xlsx");

export const getSectionFiles = () => getJson("/api/academic-head/reports/admission/section-files");
export const exportSectionFiles = () =>
  downloadFile("/api/academic-head/reports/admission/section-files/export", null, "file-per-section.xlsx");

export const getScholarshipApplicantList = (filters) =>
  getJson("/api/academic-head/reports/scholarship/applicant-list", filters);

export const getScholarshipQualificationList = (filters) =>
  getJson("/api/academic-head/reports/scholarship/qualification", filters);

export const getScholarshipResultList = (filters) => getJson("/api/academic-head/reports/scholarship/results", filters);

export const getScholarshipSlotReport = () => getJson("/api/academic-head/reports/scholarship/slots");
