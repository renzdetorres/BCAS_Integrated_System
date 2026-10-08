import { useEffect, useMemo, useState } from "react";
import { AUDIT_ACTION_LABELS, auditModule, getAllAuditLogs } from "../api/adminAuditLogsApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import { formatDateTime } from "../utils/format.js";
import "./AdminAuditLogsPage.css";

const actionLabel = (action) => AUDIT_ACTION_LABELS[action] ?? action;

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    let cancelled = false;
    getAllAuditLogs()
      .then((data) => {
        if (!cancelled) setLogs(data);
      })
      .catch((error) => {
        if (!cancelled) setErrorMessage(error instanceof ApiError ? error.message : "Failed to load the activity log.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const moduleOptions = useMemo(() => [...new Set(logs.map((l) => auditModule(l.action)))].sort(), [logs]);
  const actionOptions = useMemo(
    () => [...new Set(logs.filter((l) => !moduleFilter || auditModule(l.action) === moduleFilter).map((l) => l.action))]
      .map((value) => ({ value, label: actionLabel(value) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [logs, moduleFilter],
  );

  const rows = useMemo(
    () =>
      logs.filter((entry) => {
        const day = entry.createdAt.slice(0, 10);
        return (
          (!moduleFilter || auditModule(entry.action) === moduleFilter) &&
          (!actionFilter || entry.action === actionFilter) &&
          (!from || day >= from) &&
          (!to || day <= to)
        );
      }),
    [logs, moduleFilter, actionFilter, from, to],
  );

  const columns = [
    {
      key: "createdAt",
      header: "Date",
      accessor: (row) => row.createdAt,
      sortable: true,
      searchable: false,
      render: (row) => formatDateTime(row.createdAt),
    },
    { key: "staff", header: "User / Staff", accessor: (row) => row.userEmail, sortable: true },
    { key: "action", header: "Action", accessor: (row) => actionLabel(row.action), sortable: true },
    { key: "module", header: "Module", accessor: (row) => auditModule(row.action), sortable: true },
    { key: "details", header: "Details", accessor: (row) => row.details ?? "", render: (row) => row.details || "—" },
  ];

  const dateRange = (
    <div className="audit-date-range" role="group" aria-label="Date range">
      <input type="date" className="ui-input" aria-label="From date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
      <span aria-hidden="true">to</span>
      <input type="date" className="ui-input" aria-label="To date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
    </div>
  );

  return (
    <AppLayout>
      <DataTable
        title="Activity Log"
        subtitle="Every staff login and administrative change, most recent first. Applicant logins and their own application activity aren't included here."
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.auditLogId}
        isLoading={isLoading}
        errorMessage={errorMessage}
        emptyMessage={logs.length === 0 ? "No activity recorded yet." : "No activity matches these filters."}
        searchPlaceholder="Search by staff, action or details"
        pageSize={15}
        filters={[
          {
            key: "module",
            label: "All modules",
            value: moduleFilter,
            onChange: (value) => {
              setModuleFilter(value);
              setActionFilter("");
            },
            options: moduleOptions.map((m) => ({ value: m, label: m })),
          },
          { key: "action", label: "All actions", value: actionFilter, onChange: setActionFilter, options: actionOptions },
        ]}
        actions={dateRange}
      />
    </AppLayout>
  );
}
