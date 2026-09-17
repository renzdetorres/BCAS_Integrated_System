import { API_BASE_URL, ApiError, extractErrorMessage } from "./apiClient.js";

export async function listSystemSettings() {
  const response = await fetch(`${API_BASE_URL}/api/admin/system-settings`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError("Failed to load system settings.", response.status);
  }

  return response.json();
}

export async function setSystemSettingEnabled(settingKey, isEnabled) {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/system-settings/${encodeURIComponent(settingKey)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isEnabled }),
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extractErrorMessage(data) ?? "Failed to update system setting. Please try again.";
    throw new ApiError(message, response.status);
  }

  return data;
}
