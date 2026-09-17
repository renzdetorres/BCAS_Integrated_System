export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7100";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function extractErrorMessage(problemDetails) {
  if (!problemDetails) return null;
  if (problemDetails.detail) return problemDetails.detail;
  if (problemDetails.errors) {
    const firstField = Object.values(problemDetails.errors)[0];
    if (Array.isArray(firstField) && firstField.length > 0) return firstField[0];
  }
  return problemDetails.title ?? null;
}
