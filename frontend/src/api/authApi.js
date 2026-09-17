const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7100";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

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

function extractErrorMessage(problemDetails) {
  if (!problemDetails) return null;
  if (problemDetails.detail) return problemDetails.detail;
  if (problemDetails.errors) {
    const firstField = Object.values(problemDetails.errors)[0];
    if (Array.isArray(firstField) && firstField.length > 0) return firstField[0];
  }
  return problemDetails.title ?? null;
}
