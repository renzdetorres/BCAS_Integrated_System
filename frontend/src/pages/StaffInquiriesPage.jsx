import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listInquiryQueue } from "../api/staffInquiriesApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import "./StaffInquiriesPage.css";

function formatDateTime(isoDateTime) {
  return new Date(isoDateTime).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function StaffInquiriesPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Open");
  const [threads, setThreads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const loadThreads = useCallback(async (activeStatus) => {
    setIsLoading(true);
    try {
      const data = await listInquiryQueue({ status: activeStatus || undefined });
      setThreads(data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to load the inquiry queue.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadThreads(status);
  }, [status, loadThreads]);

  const unreadCount = threads.filter((t) => t.hasUnread).length;

  return (
    <AppLayout title="Inquiries">
      <Card>
        <p className="staff-inquiries-subtitle">
          Applicant inquiries - a lightweight ticket per applicant. Replying emails the applicant directly.
        </p>

        <div className="staff-inquiries-toolbar">
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="Open">Open</option>
            <option value="Closed">Closed</option>
            <option value="">All</option>
          </select>
          {unreadCount > 0 && (
            <span className="staff-inquiries-unread-summary">
              {unreadCount} awaiting a reply
            </span>
          )}
        </div>

        {errorMessage && (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        )}

        {isLoading ? (
          <p>Loading...</p>
        ) : threads.length === 0 ? (
          <p>No inquiries match this filter.</p>
        ) : (
          <table className="staff-inquiries-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {threads.map((thread) => (
                <tr
                  key={thread.threadId}
                  className={thread.hasUnread ? "staff-inquiry-row-unread" : ""}
                  onClick={() => navigate(`/staff/inquiries/${thread.threadId}`)}
                >
                  <td>
                    <span className="staff-inquiries-name">{thread.applicantName}</span>
                    <span className="staff-inquiries-email">{thread.applicantEmail}</span>
                  </td>
                  <td>
                    {thread.hasUnread && <span className="inquiry-unread-dot" aria-label="Awaiting reply" />}
                    {thread.subject}
                    <span className="staff-inquiries-preview">{thread.lastMessagePreview}</span>
                  </td>
                  <td>
                    <StatusBadge status={thread.status} />
                  </td>
                  <td>{formatDateTime(thread.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </AppLayout>
  );
}
