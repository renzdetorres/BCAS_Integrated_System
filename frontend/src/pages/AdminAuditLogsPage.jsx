import { useCallback, useEffect, useState } from "react";
import { getAuditLogs, AUDIT_ACTION_LABELS } from "../api/adminAuditLogsApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import "./AdminAuditLogsPage.css";

const PAGE_SIZE = 50;

function formatDateTime(isoDateTime) {
  return new Date(isoDateTime).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function AdminAuditLogsPage() {
  const [email, setEmail] = useState("");
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async (activeEmail) => {
    setIsLoading(true);
    try {
      const data = await getAuditLogs({ email: activeEmail, limit: PAGE_SIZE, offset: 0 });
      setLogs(data);
      setHasMore(data.length === PAGE_SIZE);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to load the activity log.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => load(email), 300);
    return () => clearTimeout(timeout);
  }, [email, load]);

  async function loadMore() {
    setIsLoadingMore(true);
    try {
      const data = await getAuditLogs({ email, limit: PAGE_SIZE, offset: logs.length });
      setLogs((prev) => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to load more entries.");
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <AppLayout title="Activity Log">
      <p className="audit-logs-subtitle">
        Every staff login and administrative change (account, announcement, scholarship, and exam schedule
        updates), most recent first. Applicant logins and their own application activity aren&apos;t included here.
      </p>

      <Card tier="data">
        <input
          className="ui-input audit-logs-search"
          type="search"
          placeholder="Filter by staff email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        {errorMessage && (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        )}

        {isLoading ? (
          <p className="audit-logs-empty">Loading...</p>
        ) : logs.length === 0 ? (
          <p className="audit-logs-empty">No activity recorded yet.</p>
        ) : (
          <>
            <ul className="audit-logs-list">
              {logs.map((entry) => (
                <li key={entry.auditLogId}>
                  <div className="audit-logs-row-main">
                    <span className="audit-logs-email">{entry.userEmail}</span>
                    <span className="audit-logs-action">{AUDIT_ACTION_LABELS[entry.action] ?? entry.action}</span>
                    <span className="audit-logs-time">{formatDateTime(entry.createdAt)}</span>
                  </div>
                  {entry.details && <p className="audit-logs-details">{entry.details}</p>}
                </li>
              ))}
            </ul>

            {hasMore && (
              <div className="audit-logs-load-more">
                <Button type="button" tone="secondary" size="sm" onClick={loadMore} disabled={isLoadingMore}>
                  {isLoadingMore ? "Loading..." : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </AppLayout>
  );
}
