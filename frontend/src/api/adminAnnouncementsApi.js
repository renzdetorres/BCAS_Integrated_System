import { API_BASE_URL, ApiError, extractErrorMessage } from "./apiClient.js";

export async function listAnnouncements() {
  const response = await fetch(`${API_BASE_URL}/api/admin/announcements`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError("Failed to load announcements.", response.status);
  }

  return response.json();
}

export async function createAnnouncement({ category, title, body }) {
  const response = await fetch(`${API_BASE_URL}/api/admin/announcements`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ category, title, body }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extractErrorMessage(data) ?? "Failed to create the announcement. Please try again.";
    throw new ApiError(message, response.status);
  }

  return data;
}

export async function setAnnouncementActiveStatus(announcementId, isActive) {
  const response = await fetch(`${API_BASE_URL}/api/admin/announcements/${announcementId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ isActive }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extractErrorMessage(data) ?? "Failed to update the announcement's status. Please try again.";
    throw new ApiError(message, response.status);
  }

  return data;
}
