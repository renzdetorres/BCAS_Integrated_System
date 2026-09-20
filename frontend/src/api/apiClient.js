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

const SESSION_EXPIRED_MESSAGE = "Your session has expired. Please log in again.";

/**
 * A 401 on an already-authenticated call (session expired, or the auth
 * cookie was cleared some other way) has no response body, so
 * extractErrorMessage always falls through to the caller's generic
 * fallback - which looks like a real failure rather than a login problem.
 * Callers on an authenticated flow should use this instead of
 * extractErrorMessage directly; login/register themselves should keep
 * using extractErrorMessage, since a 401 there is a real "wrong
 * credentials" response, not a session expiry.
 */
export function resolveErrorMessage(response, problemDetails, fallbackMessage) {
  if (response.status === 401) {
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
    return SESSION_EXPIRED_MESSAGE;
  }
  return extractErrorMessage(problemDetails) ?? fallbackMessage;
}
