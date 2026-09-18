import { API_BASE_URL, ApiError, extractErrorMessage } from "./apiClient.js";

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

  if (!response.ok) {
    throw new ApiError("Failed to load this report.", response.status);
  }

  return response.json();
}

async function downloadFile(path, params, fallbackFileName) {
  const response = await fetch(`${API_BASE_URL}${path}${buildQuery(params)}`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError("Failed to export this report.", response.status);
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

export const getEnrollmentList = (filters) => getJson("/api/admin/reports/admission/enrollment-list", filters);
export const exportEnrollmentList = (filters) =>
  downloadFile("/api/admin/reports/admission/enrollment-list/export", filters, "enrollment-list.xlsx");

export const getEnrollmentSummary = () => getJson("/api/admin/reports/admission/enrollment-summary");
export const exportEnrollmentSummary = () =>
  downloadFile("/api/admin/reports/admission/enrollment-summary/export", null, "enrollment-summary.xlsx");

export const getSectionFiles = () => getJson("/api/admin/reports/admission/section-files");
export const exportSectionFiles = () =>
  downloadFile("/api/admin/reports/admission/section-files/export", null, "file-per-section.xlsx");

export const getScholarshipApplicantList = (filters) => getJson("/api/admin/reports/scholarship/applicant-list", filters);

export const getScholarshipQualificationList = (filters) => getJson("/api/admin/reports/scholarship/qualification", filters);

export const getScholarshipResultList = (filters) => getJson("/api/admin/reports/scholarship/results", filters);

export const getScholarshipSlotReport = () => getJson("/api/admin/reports/scholarship/slots");

export async function getScholarshipContract(applicationId) {
  const response = await fetch(`${API_BASE_URL}/api/admin/reports/scholarship/${applicationId}/contract`, {
    method: "GET",
    credentials: "include",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extractErrorMessage(data) ?? "Failed to load this scholarship contract.";
    throw new ApiError(message, response.status);
  }

  return data;
}
