import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

export async function listMyInquiries() {
  const response = await fetch(`${API_BASE_URL}/api/inquiries`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, null, "Failed to load your inquiries."), response.status);
  }

  return response.json();
}

export async function getMyInquiryDetail(threadId) {
  const response = await fetch(`${API_BASE_URL}/api/inquiries/${threadId}`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, null, "Failed to load this inquiry."), response.status);
  }

  return response.json();
}

export async function createInquiry({ subject, body }) {
  const response = await fetch(`${API_BASE_URL}/api/inquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ subject, body }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resolveErrorMessage(response, data, "Failed to send your inquiry. Please try again.");
    throw new ApiError(message, response.status);
  }

  return data;
}

export async function postInquiryMessage(threadId, { body }) {
  const response = await fetch(`${API_BASE_URL}/api/inquiries/${threadId}/messages`, {
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
