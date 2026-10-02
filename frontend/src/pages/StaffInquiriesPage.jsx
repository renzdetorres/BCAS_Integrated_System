import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { closeInquiry, listInquiryQueue, reopenInquiry } from "../api/staffInquiriesApi.js";
import { ApiError } from "../api/apiClient.js";
import { useToast } from "../context/ToastContext.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import DataTable, { PersonCell, RowAction } from "../components/ui/DataTable.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { formatDateTime } from "../utils/format.js";
import "./StaffInquiriesPage.css";

export default function StaffInquiriesPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [threads, setThreads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [statusFilter, setStatusFilter] = useState("Open");
  const [replyFilter, setReplyFilter] = useState("");
  const [changingId, setChangingId] = useState(null);

  const loadThreads = useCallback(async () => {
    setIsLoading(true);
    try {
      setThreads(await listInquiryQueue());
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to load the inquiry queue.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  async function toggleStatus(thread) {
    setChangingId(thread.threadId);
    try {
      if (thread.status === "Open") {
        await closeInquiry(thread.threadId);
      } else {
        await reopenInquiry(thread.threadId);
      }
      setThreads((prev) =>
        prev.map((t) => (t.threadId === thread.threadId ? { ...t, status: t.status === "Open" ? "Closed" : "Open" } : t)),
      );
      showToast(`"${thread.subject}" ${thread.status === "Open" ? "closed" : "reopened"}.`);
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "Failed to update the inquiry.", "error");
    } finally {
      setChangingId(null);
    }
  }

  const rows = useMemo(
    () =>
      threads.filter(
        (t) =>
          (!statusFilter || t.status === statusFilter) &&
          (!replyFilter || (replyFilter === "awaiting" ? t.hasUnread : !t.hasUnread)),
      ),
    [threads, statusFilter, replyFilter],
  );

  const openCount = threads.filter((t) => t.status === "Open").length;
  const awaitingCount = threads.filter((t) => t.status === "Open" && t.hasUnread).length;

  const columns = [
    {
      key: "applicant",
      header: "Applicant",
      accessor: (row) => `${row.applicantName} ${row.applicantEmail}`,
      sortable: true,
      render: (row) => <PersonCell name={row.applicantName} detail={row.applicantEmail} />,
    },
    {
      key: "subject",
      header: "Subject",
      accessor: (row) => `${row.subject} ${row.lastMessagePreview ?? ""}`,
      sortable: true,
      render: (row) => (
        <span className="inquiry-cell">
          <span className="inquiry-cell-subject">
            {row.hasUnread ? <span className="inquiry-unread" aria-label="Awaiting a reply" /> : null}
            {row.subject}
          </span>
          {row.lastMessagePreview ? <span className="inquiry-cell-preview">{row.lastMessagePreview}</span> : null}
        </span>
      ),
    },
    {
      key: "messageCount",
      header: "Messages",
      align: "right",
      sortable: true,
      searchable: false,
    },
    {
      key: "status",
      header: "Status",
      accessor: (row) => (row.status === "Open" && row.hasUnread ? "Awaiting reply" : row.status),
      sortable: true,
      render: (row) =>
        row.status === "Open" && row.hasUnread ? (
          <StatusBadge status="Pending" label="Awaiting reply" />
        ) : (
          <StatusBadge status={row.status === "Open" ? "Active" : "Inactive"} label={row.status} />
        ),
    },
    {
      key: "updatedAt",
      header: "Last activity",
      sortable: true,
      searchable: false,
      render: (row) => formatDateTime(row.updatedAt),
    },
    {
      key: "action",
      header: "Action",
      align: "right",
      searchable: false,
      render: (row) => (
        <span className="inquiry-actions">
          <RowAction
            label={row.status === "Open" ? "Reply" : "View"}
            icon="message"
            onClick={() => navigate(`/staff/inquiries/${row.threadId}`)}
            ariaLabel={`Open "${row.subject}" from ${row.applicantName}`}
          />
          <button
            type="button"
            className="inquiry-status-button"
            disabled={changingId === row.threadId}
            onClick={(event) => {
              event.stopPropagation();
              toggleStatus(row);
            }}
          >
            {changingId === row.threadId ? "Saving..." : row.status === "Open" ? "Close" : "Reopen"}
          </button>
        </span>
      ),
    },
  ];

  return (
    <AppLayout>
      <DataTable
        title="Inquiries"
        subtitle="Questions from applicants, one thread each. Replying emails the applicant directly."
        summary={[
          { label: "Open", value: openCount.toLocaleString() },
          { label: "Awaiting a reply", value: awaitingCount.toLocaleString(), tone: "amber" },
          { label: "Closed", value: (threads.length - openCount).toLocaleString() },
        ]}
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.threadId}
        isLoading={isLoading}
        errorMessage={errorMessage}
        emptyMessage={threads.length === 0 ? "No inquiries yet." : "No inquiries match these filters."}
        onRowClick={(row) => navigate(`/staff/inquiries/${row.threadId}`)}
        searchPlaceholder="Search by applicant, email or subject"
        filters={[
          {
            key: "status",
            label: "Any status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: "Open", label: "Open" },
              { value: "Closed", label: "Closed" },
            ],
          },
          {
            key: "reply",
            label: "Any reply state",
            value: replyFilter,
            onChange: setReplyFilter,
            options: [
              { value: "awaiting", label: "Awaiting a reply" },
              { value: "replied", label: "Replied" },
            ],
          },
        ]}
      />
    </AppLayout>
  );
}
