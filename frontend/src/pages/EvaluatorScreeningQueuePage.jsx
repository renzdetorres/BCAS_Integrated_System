import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/layout/AppShell.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { getEvaluatorDashboard } from "../api/evaluatorDashboardApi.js";
import { ApiError } from "../api/apiClient.js";

function formatDate(isoDateTime) {
  return new Date(isoDateTime).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function EvaluatorScreeningQueuePage() {
  const [queue, setQueue] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    getEvaluatorDashboard()
      .then((data) => setQueue(data.queue))
      .catch((error) => setErrorMessage(error instanceof ApiError ? error.message : "Failed to load queue."))
      .finally(() => setIsLoading(false));
  }, []);

  const columns = [
    { key: "applicant", header: "Applicant", render: (row) => row.applicantName },
    { key: "ref", header: "Ref. No.", render: (row) => row.applicationId.slice(0, 8).toUpperCase() },
    { key: "program", header: "Program", render: (row) => row.scholarshipName },
    { key: "gwa", header: "GWA", render: (row) => row.gradeAverage },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "date",
      header: "Date",
      sortable: true,
      sortValue: (row) => new Date(row.submittedAt).getTime(),
      render: (row) => formatDate(row.submittedAt),
    },
    {
      key: "screen",
      header: "",
      render: (row) => (
        <Link to={`/evaluator/scholarship-applications/${row.applicationId}`} className="font-semibold text-forest hover:underline">
          Screen →
        </Link>
      ),
    },
  ];

  return (
    <AppShell badges={{ screening: queue.length || undefined }}>
      <h1 className="text-2xl font-extrabold text-slate-900">Screening Queue</h1>
      <p className="mt-1 text-sm text-slate-500">Scholarship applications awaiting eligibility screening.</p>

      {errorMessage && (
        <p className="mt-4 text-sm font-medium text-status-red" role="alert">
          {errorMessage}
        </p>
      )}

      <div className="mt-6">
        <DataTable
          columns={columns}
          rows={queue}
          rowKey={(row) => row.applicationId}
          isLoading={isLoading}
          emptyMessage="No scholarship applications awaiting evaluation."
        />
      </div>
    </AppShell>
  );
}
