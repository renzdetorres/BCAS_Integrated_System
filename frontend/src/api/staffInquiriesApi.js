import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

export async function listInquiryQueue({ status } = {}) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  const query = params.toString();

  const response = await fetch(`${API_BASE_URL}/api/staff/inquiries${query ? `?${query}` : ""}`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, null, "Failed to load the inquiry queue."), response.status);
  }

  return response.json();
}

export async function getInquiryDetail(threadId) {
  const response = await fetch(`${API_BASE_URL}/api/staff/inquiries/${threadId}`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, null, "Failed to load this inquiry."), response.status);
  }

  return response.json();
}

export async function postStaffInquiryMessage(threadId, { body }) {
  const response = await fetch(`${API_BASE_URL}/api/staff/inquiries/${threadId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ body }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resolveErrorMessage(response, data, "Failed to send your reply. Please try again.");
    throw new ApiError(message, response.status);
  }

  return data;
}

export async function closeInquiry(threadId) {
  const response = await fetch(`${API_BASE_URL}/api/staff/inquiries/${threadId}/close`, {
    method: "POST",
    credentials: "include",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resolveErrorMessage(response, data, "Failed to close this inquiry. Please try again.");
    throw new ApiError(message, response.status);
  }

  return data;
}

export async function reopenInquiry(threadId) {
  const response = await fetch(`${API_BASE_URL}/api/staff/inquiries/${threadId}/reopen`, {
    method: "POST",
    credentials: "include",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resolveErrorMessage(response, data, "Failed to reopen this inquiry. Please try again.");
    throw new ApiError(message, response.status);
  }

  return data;
}
