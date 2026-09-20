import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

export async function listReservations() {
  const response = await fetch(`${API_BASE_URL}/api/admin/reservations`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, null, "Failed to load reservations."), response.status);
  }

  return response.json();
}

export async function recordReservation(applicationId, { isReserved, remarks }) {
  const response = await fetch(`${API_BASE_URL}/api/admin/reservations/${applicationId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ isReserved, remarks: remarks?.trim() === "" ? null : remarks }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resolveErrorMessage(response, data, "Failed to record the reservation. Please try again.");
    throw new ApiError(message, response.status);
  }

  return data;
}
