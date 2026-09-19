import { useEffect, useMemo, useState } from "react";
import AppShell from "../components/layout/AppShell.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { getEvaluatorDashboard } from "../api/evaluatorDashboardApi.js";
import { ApiError } from "../api/apiClient.js";

// NOTE: there is no "list all scholarship applications" endpoint for
// Evaluators yet - only the dashboard's queue + recently-evaluated lists.
// This screen combines those two real lists. Income/Siblings have no
// backing field anywhere in the schema, so they show as "—" rather than
// fabricated values.
function formatDate(isoDateTime) {
  return new Date(isoDateTime).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function EvaluatorScholarshipApplicationsPage() {
  const [search, setSearch] = useState("");
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    getEvaluatorDashboard()
      .then((data) => setApplications([...data.queue, ...data.recentlyEvaluated]))
      .catch((error) =>
        setErrorMessage(error instanceof ApiError ? error.message : "Failed to load scholarship applications.")
      )
      .finally(() => setIsLoading(false));
  }, []);

  const rows = useMemo(
    () =>
      applications.filter((a) => a.applicantName.toLowerCase().includes(search.toLowerCase())),
    [applications, search]
  );

  const columns = [
    { key: "applicant", header: "Applicant", render: (row) => row.applicantName },
    { key: "ref", header: "Ref. No.", render: (row) => row.applicationId.slice(0, 8).toUpperCase() },
    { key: "type", header: "Type", render: (row) => row.scholarshipType },
    {
      key: "gwa",
      header: "GWA",
      render: (row) => <span className={row.gradeAverage < 85 ? "font-semibold text-status-red" : ""}>{row.gradeAverage}</span>,
    },
    { key: "income", header: "Income/Mo", render: () => "—" },
    { key: "siblings", header: "Siblings", render: () => "—" },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "date",
      header: "Date",
      sortable: true,
      sortValue: (row) => new Date(row.submittedAt).getTime(),
      render: (row) => formatDate(row.submittedAt),
    },
  ];

  return (
    <AppShell>
      <h1 className="text-2xl font-extrabold text-slate-900">Scholarship Applications</h1>
      <p className="mt-1 text-sm text-slate-500">Scholarship-type applications only · Evaluator view</p>

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
          emptyMessage="No scholarship applications found."
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by applicant name..."
        />
      </div>
    </AppShell>
  );
}
