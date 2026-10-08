import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

/** The signed-in user's own blocked page keys (empty for a Super Admin). */
export async function getMyBlockedFeatures() {
  const response = await fetch(`${API_BASE_URL}/api/auth/access`, { method: "GET", credentials: "include" });
  if (!response.ok) return [];
  const data = await response.json().catch(() => null);
  return data?.blockedFeatures ?? [];
}

/** Every role's pages and whether each is blocked, plus whether the caller may change them. */
export async function getRoleAccess() {
  const response = await fetch(`${API_BASE_URL}/api/admin/role-access`, { method: "GET", credentials: "include" });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, data, "Failed to load role access."), response.status);
  }
  return data;
}

/** Super Admin only. */
export async function setRoleAccess({ role, featureKey, blocked }) {
  const response = await fetch(`${API_BASE_URL}/api/admin/role-access`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ role, featureKey, blocked }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(resolveErrorMessage(response, data, "Failed to update access."), response.status);
  }
}
