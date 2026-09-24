import { API_BASE_URL, ApiError, extractErrorMessage } from "./apiClient.js";

export { ApiError } from "./apiClient.js";

export async function registerApplicant({ firstName, lastName, email, password }) {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstName, lastName, email, password }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extractErrorMessage(data) ?? "Registration failed. Please try again.";
    throw new ApiError(message, response.status);
  }

  return data;
}

export async function loginUser({ email, password }) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Required so the browser stores/sends the HttpOnly auth cookie the API sets.
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extractErrorMessage(data) ?? "Login failed. Please try again.";
    throw new ApiError(message, response.status);
  }

  return data;
}

/**
 * Always resolves - the API returns 204 whether or not the email matches an
 * account, so the UI can show the same "check your email" message either
 * way (no way to tell from here whether a real account got the email).
 */
export async function forgotPassword(email) {
  const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new ApiError("Something went wrong. Please try again.", response.status);
  }
}

export async function resetPassword({ token, newPassword }) {
  const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message = extractErrorMessage(data) ?? "Failed to reset your password. Please try again.";
    throw new ApiError(message, response.status);
  }
}

export async function logoutUser() {
  const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: "POST",
    // Required so the browser sends the HttpOnly auth cookie for the API to clear.
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError("Logout failed. Please try again.", response.status);
  }
}

/**
 * Checks the current session against the auth cookie.
 * Returns the signed-in user's profile, or null when unauthenticated.
 */
export async function getSession() {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: "GET",
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new ApiError("Failed to check session.", response.status);
  }

  return response.json();
}
