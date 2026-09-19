import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/layout/AppShell.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { searchApplications } from "../api/adminApplicationsApi.js";
import { ApiError } from "../api/apiClient.js";

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "Admission", label: "Admission" },
  { value: "Scholarship", label: "Scholarship" },
];

function formatDate(isoDateTime) {
  return new Date(isoDateTime).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminArchivePage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const load = useCallback(() => {
    setIsLoading(true);
    searchApplications({ search, category, archived: true })
      .then((data) => {
        setApplications(data);
        setErrorMessage(null);
      })
      .catch((error) => {
        setErrorMessage(error instanceof ApiError ? error.message : "Failed to load archived records.");
      })
      .finally(() => setIsLoading(false));
  }, [search, category]);

  useEffect(() => {
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
  }, [load]);

  const columns = [
    {
      key: "applicant",
      header: "Applicant",
      render: (row) => (
        <Link to={`/admin/applications/${row.applicationId}`} className="block hover:underline">
          <p className="font-semibold text-slate-800">{row.applicantName}</p>
          <p className="text-xs text-slate-400">{row.applicantEmail}</p>
        </Link>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (row) => (
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
          {row.category}
        </span>
      ),
    },
    { key: "program", header: "Program", render: (row) => row.courseAppliedFor ?? row.scholarshipName },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "archived",
      header: "Archived",
      sortable: true,
      sortValue: (row) => new Date(row.archivedAt).getTime(),
      render: (row) => formatDate(row.archivedAt),
    },
    { key: "reason", header: "Reason", render: (row) => row.archiveReason ?? "—" },
  ];

  return (
    <AppShell>
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Records Archive</h1>
        <p className="mt-1 text-sm text-slate-500">
          Completed/inactive admission and scholarship applications archived to support the school's document
          disposal process. Nothing here is deleted — every record (and, for an Admission application, its
          documents) remains retrievable for the school's 5-year retention practice.
        </p>
      </div>

      {errorMessage && (
        <p className="mt-4 text-sm font-medium text-status-red" role="alert">
          {errorMessage}
        </p>
      )}

      <div className="mt-6">
        <DataTable
          columns={columns}
          rows={applications}
          rowKey={(row) => row.applicationId}
          isLoading={isLoading}
          emptyMessage="No archived records match these filters."
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by applicant name or email..."
          filters={[{ label: "Type", value: category, onChange: setCategory, options: TYPE_OPTIONS }]}
        />
      </div>
    </AppShell>
  );
}
