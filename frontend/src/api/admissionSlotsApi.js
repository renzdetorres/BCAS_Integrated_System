import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

async function readJson(response, fallbackMessage) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, data, fallbackMessage), response.status);
  }

  return data;
}

/** Admin: every level with its slot limit and how many slots are taken. */
export async function getAdmissionSlots() {
  const response = await fetch(`${API_BASE_URL}/api/admin/admission-slots`, { method: "GET", credentials: "include" });
  return readJson(response, "Failed to load the admission slots.");
}

/** Admin: saves the limit of each level (`slots: null` means no limit) and returns the refreshed list. */
export async function saveAdmissionSlots(levels) {
  const response = await fetch(`${API_BASE_URL}/api/admin/admission-slots`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ levels }),
  });
  return readJson(response, "Failed to save the admission slots.");
}

/** Applicant: which levels are full, so the form can say so before they submit. */
export async function getAdmissionSlotAvailability() {
  const response = await fetch(`${API_BASE_URL}/api/admission-slots`, { method: "GET", credentials: "include" });
  return readJson(response, "Failed to load the admission slots.");
}
