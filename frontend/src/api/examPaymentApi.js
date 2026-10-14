import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

async function read(response, fallback) {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, data, fallback), response.status);
  }
  return data;
}

async function readBlob(response) {
  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, null, "Failed to load this file."), response.status);
  }
  return response.blob();
}

// ---- Applicant ----------------------------------------------------------

/** The applicant's payment: amount, QR code, instructions and where the review stands. */
export async function getMyExamPayment() {
  return read(
    await fetch(`${API_BASE_URL}/api/exam-payment`, { method: "GET", credentials: "include" }),
    "Failed to load your payment."
  );
}

/** Uploads (or replaces) the proof of payment. */
export async function submitPaymentProof(file, referenceNumber) {
  const formData = new FormData();
  formData.append("file", file);
  if (referenceNumber) formData.append("referenceNumber", referenceNumber);

  return read(
    await fetch(`${API_BASE_URL}/api/exam-payment/proof`, { method: "PUT", credentials: "include", body: formData }),
    "Failed to upload your proof of payment. Please try again."
  );
}

export async function getMyPaymentProofFile() {
  return readBlob(await fetch(`${API_BASE_URL}/api/exam-payment/proof`, { method: "GET", credentials: "include" }));
}

// ---- Staff --------------------------------------------------------------

export const PAYMENT_STATUSES = ["Pending", "Verified", "Rejected"];

export async function listExamPayments(status) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return read(
    await fetch(`${API_BASE_URL}/api/staff/payments${query}`, { method: "GET", credentials: "include" }),
    "Failed to load payments."
  );
}

export async function getPaymentProofFile(paymentId) {
  return readBlob(await fetch(`${API_BASE_URL}/api/staff/payments/${paymentId}/proof`, { method: "GET", credentials: "include" }));
}

export async function verifyExamPayment(paymentId, invoiceNumber) {
  return read(
    await fetch(`${API_BASE_URL}/api/staff/payments/${paymentId}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ invoiceNumber: invoiceNumber || null }),
    }),
    "Failed to verify the payment."
  );
}

export async function rejectExamPayment(paymentId, reason) {
  return read(
    await fetch(`${API_BASE_URL}/api/staff/payments/${paymentId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ reason }),
    }),
    "Failed to reject the payment."
  );
}

export async function setPaymentInvoice(paymentId, invoiceNumber) {
  return read(
    await fetch(`${API_BASE_URL}/api/staff/payments/${paymentId}/invoice`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ invoiceNumber }),
    }),
    "Failed to save the invoice number."
  );
}
