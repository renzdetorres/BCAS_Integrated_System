import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createInquiry, listMyInquiries } from "../api/inquiriesApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import "./InquiriesPage.css";

function formatDateTime(isoDateTime) {
  return new Date(isoDateTime).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const initialForm = { subject: "", body: "" };

export default function InquiriesPage() {
  const navigate = useNavigate();
  const [threads, setThreads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const loadThreads = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listMyInquiries();
      setThreads(data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to load your inquiries.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const created = await createInquiry(form);
      setForm(initialForm);
      navigate(`/inquiries/${created.threadId}`);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Failed to send your inquiry. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppLayout title="Inquiries">
      <Card>
        <h2>My Inquiries</h2>
        <p className="inquiries-subtitle">
          Have a question about your application, a flagged document, or anything else? Send a message here instead
          of calling the office - Support Staff/Admin will reply directly on the thread.
        </p>

        {errorMessage && (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        )}

        {isLoading ? (
          <p>Loading...</p>
        ) : threads.length === 0 ? (
          <p>No inquiries yet. Use the form below to send one.</p>
        ) : (
          <ul className="inquiries-list">
            {threads.map((thread) => (
              <li key={thread.threadId}>
                <button type="button" className="inquiry-row" onClick={() => navigate(`/inquiries/${thread.threadId}`)}>
                  <div className="inquiry-row-main">
                    <span className="inquiry-subject">
                      {thread.subject}
                      {thread.hasUnread && <span className="inquiry-unread-dot" aria-label="New reply" />}
                    </span>
                    <span className="inquiry-preview">{thread.lastMessagePreview}</span>
                  </div>
                  <div className="inquiry-row-meta">
                    <StatusBadge status={thread.status} />
                    <span className="inquiry-updated">{formatDateTime(thread.updatedAt)}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="inquiries-form-card">
        <h2>Send a New Inquiry</h2>

        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <label htmlFor="subject">Subject</label>
            <input
              id="subject"
              name="subject"
              type="text"
              maxLength={200}
              required
              value={form.subject}
              onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
            />
          </div>

          <div className="form-row">
            <label htmlFor="body">Message</label>
            <textarea
              id="body"
              name="body"
              rows={4}
              maxLength={2000}
              required
              value={form.body}
              onChange={(event) => setForm((prev) => ({ ...prev, body: event.target.value }))}
            />
          </div>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send Inquiry"}
          </button>
        </form>
      </Card>
    </AppLayout>
  );
}
