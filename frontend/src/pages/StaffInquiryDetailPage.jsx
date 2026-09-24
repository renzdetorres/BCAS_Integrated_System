import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { closeInquiry, getInquiryDetail, postStaffInquiryMessage, reopenInquiry } from "../api/staffInquiriesApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import "./StaffInquiryDetailPage.css";

function formatDateTime(isoDateTime) {
  return new Date(isoDateTime).toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function StaffInquiryDetailPage() {
  const { threadId } = useParams();
  const [thread, setThread] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const [replyBody, setReplyBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [replyError, setReplyError] = useState(null);

  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  const loadThread = useCallback(() => {
    let cancelled = false;
    setIsLoading(true);
    getInquiryDetail(threadId)
      .then((data) => {
        if (!cancelled) setThread(data);
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof ApiError ? error.message : "Failed to load this inquiry.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [threadId]);

  useEffect(() => loadThread(), [loadThread]);

  async function handleReplySubmit(event) {
    event.preventDefault();
    if (replyBody.trim().length === 0) {
      setReplyError("Type a message before sending.");
      return;
    }

    setIsSending(true);
    setReplyError(null);
    try {
      const updated = await postStaffInquiryMessage(threadId, { body: replyBody.trim() });
      setThread(updated);
      setReplyBody("");
    } catch (error) {
      setReplyError(error instanceof ApiError ? error.message : "Failed to send your reply.");
    } finally {
      setIsSending(false);
    }
  }

  async function handleToggleStatus() {
    setIsTogglingStatus(true);
    setErrorMessage(null);
    try {
      const updated = thread.status === "Open" ? await closeInquiry(threadId) : await reopenInquiry(threadId);
      setThread((prev) => ({ ...prev, status: updated.status }));
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to update this inquiry's status.");
    } finally {
      setIsTogglingStatus(false);
    }
  }

  return (
    <AppLayout
      title="Inquiry"
      actions={
        <Link className="inquiry-detail-back-link" to="/staff/inquiries">
          &larr; Back to inquiries
        </Link>
      }
    >
      {isLoading && (
        <div className="inquiry-detail-card">
          <p>Loading...</p>
        </div>
      )}
      {errorMessage && (
        <div className="inquiry-detail-card">
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        </div>
      )}

      {!isLoading && thread && (
        <div className="inquiry-detail-card">
          <div className="inquiry-detail-header">
            <div>
              <h2>{thread.subject}</h2>
              <p className="inquiry-detail-applicant">
                {thread.applicantName} &middot; {thread.applicantEmail}
              </p>
            </div>
            <div className="inquiry-detail-header-actions">
              <StatusBadge status={thread.status} />
              <button type="button" className="inquiry-toggle-status" onClick={handleToggleStatus} disabled={isTogglingStatus}>
                {isTogglingStatus ? "Saving..." : thread.status === "Open" ? "Close Inquiry" : "Reopen Inquiry"}
              </button>
            </div>
          </div>

          <ul className="inquiry-thread">
            {thread.messages.map((message) => (
              <li
                key={message.messageId}
                className={message.isFromStaff ? "inquiry-message inquiry-message-self" : "inquiry-message inquiry-message-other"}
              >
                <div className="inquiry-message-bubble">
                  <p className="inquiry-message-body">{message.body}</p>
                </div>
                <div className="inquiry-message-meta">
                  <span>{message.isFromStaff ? message.senderName : thread.applicantName}</span>
                  <span>{formatDateTime(message.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>

          {replyError && (
            <p className="form-error" role="alert">
              {replyError}
            </p>
          )}

          <form onSubmit={handleReplySubmit} className="inquiry-reply-form" noValidate>
            <textarea
              rows={3}
              maxLength={2000}
              placeholder="Type your reply - the applicant is notified by email."
              value={replyBody}
              onChange={(event) => setReplyBody(event.target.value)}
            />
            <button type="submit" disabled={isSending}>
              {isSending ? "Sending..." : "Send Reply"}
            </button>
          </form>
        </div>
      )}
    </AppLayout>
  );
}
