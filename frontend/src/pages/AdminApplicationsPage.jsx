import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/layout/AppShell.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { searchApplications } from "../api/adminApplicationsApi.js";
import { APPLICATION_TYPES } from "../api/admissionApi.js";
import { ApiError } from "../api/apiClient.js";
import { exportRowsToCsv } from "../lib/exportCsv.js";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "Submitted", label: "Submitted" },
  { value: "UnderReview", label: "Under Review" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
];

const LEVEL_OPTIONS = [
  { value: "", label: "All Levels" },
  { value: "NewStudent", label: "New Student" },
  { value: "Transferee", label: "Transferee" },
];

function formatDate(isoDateTime) {
  return new Date(isoDateTime).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function admissionTypeLabel(applicationType) {
  return APPLICATION_TYPES.find((t) => t.value === applicationType)?.label ?? applicationType;
}

export default function AdminApplicationsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [level, setLevel] = useState("");
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [selected, setSelected] = useState([]);

  const load = useCallback(() => {
    setIsLoading(true);
    searchApplications({ search, status, category: "Admission" })
      .then((data) => {
        setApplications(data);
        setErrorMessage(null);
      })
      .catch((error) => {
        setErrorMessage(error instanceof ApiError ? error.message : "Failed to load applications.");
      })
      .finally(() => setIsLoading(false));
  }, [search, status]);

  useEffect(() => {
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
  }, [load]);

  const rows = useMemo(
    () => (level ? applications.filter((a) => a.applicationType === level) : applications),
    [applications, level]
  );

  function handleExport() {
    exportRowsToCsv(
      "applications.csv",
      [
        { header: "Applicant", value: (r) => r.applicantName },
        { header: "Email", value: (r) => r.applicantEmail },
        { header: "App. No.", value: (r) => r.applicationId },
        { header: "Level", value: (r) => admissionTypeLabel(r.applicationType) },
        { header: "Program", value: (r) => r.courseAppliedFor },
        { header: "Status", value: (r) => r.status },
        { header: "Date", value: (r) => formatDate(r.submittedAt) },
      ],
      rows
    );
  }

  const columns = [
    {
      key: "applicant",
      header: "Applicant",
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-800">{row.applicantName}</p>
          <p className="text-xs text-slate-400">{row.applicantEmail}</p>
        </div>
      ),
    },
    {
      key: "appNo",
      header: "App. No.",
      render: (row) => row.applicationId.slice(0, 8).toUpperCase(),
    },
    { key: "level", header: "Level", render: (row) => admissionTypeLabel(row.applicationType) },
    { key: "program", header: "Program", render: (row) => row.courseAppliedFor },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "date",
      header: "Date",
      sortable: true,
      sortValue: (row) => new Date(row.submittedAt).getTime(),
      render: (row) => formatDate(row.submittedAt),
    },
    {
      key: "review",
      header: "",
      render: (row) => (
        <Link to={`/admin/applications/${row.applicationId}`} className="font-semibold text-forest hover:underline">
          Review →
        </Link>
      ),
    },
  ];

  return (
    <AppShell badges={{ applications: rows.length || undefined }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Applications</h1>
          <p className="mt-1 text-sm text-slate-500">{rows.length} applications found</p>
        </div>
      </div>

      {errorMessage && (
        <p className="mt-4 text-sm font-medium text-status-red" role="alert">
          {errorMessage}
        </p>
      )}

      <div className="mt-6">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.applicationId}
          isLoading={isLoading}
          emptyMessage="No applications match these filters."
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by name or App. No..."
          filters={[
            { label: "Status", value: status, onChange: setStatus, options: STATUS_OPTIONS },
            { label: "Level", value: level, onChange: setLevel, options: LEVEL_OPTIONS },
          ]}
          onExport={handleExport}
          exportLabel="Export"
          selectable
          selectedKeys={selected}
          onToggleRow={(key, checked) =>
            setSelected((prev) => (checked ? [...prev, key] : prev.filter((k) => k !== key)))
          }
          onToggleAll={(checked) => setSelected(checked ? rows.map((r) => r.applicationId) : [])}
        />
      </div>
    </AppShell>
  );
}
