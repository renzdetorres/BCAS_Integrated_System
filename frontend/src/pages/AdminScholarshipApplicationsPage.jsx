import { useCallback, useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import Modal from "../components/ui/Modal.jsx";
import { searchApplications } from "../api/adminApplicationsApi.js";
import { ApiError } from "../api/apiClient.js";
import { exportRowsToCsv } from "../lib/exportCsv.js";

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "Merit-Based", label: "Merit-Based" },
  { value: "Need-Based", label: "Need-Based" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "Submitted", label: "Submitted" },
  { value: "UnderReview", label: "Under Review" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
];

function formatDate(isoDateTime) {
  return new Date(isoDateTime).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminScholarshipApplicationsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [viewing, setViewing] = useState(null);

  const load = useCallback(() => {
    setIsLoading(true);
    searchApplications({ search, status, category: "Scholarship" })
      .then((data) => {
        setApplications(type ? data.filter((a) => a.scholarshipType === type) : data);
        setErrorMessage(null);
      })
      .catch((error) => {
        setErrorMessage(error instanceof ApiError ? error.message : "Failed to load scholarship applications.");
      })
      .finally(() => setIsLoading(false));
  }, [search, status, type]);

  useEffect(() => {
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
  }, [load]);

  function handleExport() {
    exportRowsToCsv(
      "scholarship-applications.csv",
      [
        { header: "Applicant", value: (r) => r.applicantName },
        { header: "Ref. No.", value: (r) => r.applicationId },
        { header: "Scholarship Type", value: (r) => r.scholarshipType },
        { header: "GWA", value: (r) => r.gradeAverage },
        { header: "Program", value: (r) => r.scholarshipName },
        { header: "Status", value: (r) => r.status },
        { header: "Date", value: (r) => formatDate(r.submittedAt) },
      ],
      applications
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
    { key: "ref", header: "Ref. No.", render: (row) => row.applicationId.slice(0, 8).toUpperCase() },
    { key: "type", header: "Scholarship Type", render: (row) => row.scholarshipType },
    { key: "gwa", header: "GWA", render: (row) => row.gradeAverage },
    { key: "program", header: "Level/Program", render: (row) => row.scholarshipName },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "date",
      header: "Date",
      sortable: true,
      sortValue: (row) => new Date(row.submittedAt).getTime(),
      render: (row) => formatDate(row.submittedAt),
    },
    {
      key: "view",
      header: "",
      render: (row) => (
        <button type="button" onClick={() => setViewing(row)} className="font-semibold text-forest hover:underline">
          View
        </button>
      ),
    },
  ];

  return (
    <AppShell>
      <h1 className="text-2xl font-extrabold text-slate-900">Scholarship Applications</h1>
      <p className="mt-1 text-sm text-slate-500">{applications.length} applications · SY 2025-2026</p>

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
          emptyMessage="No scholarship applications match these filters."
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by name or Ref. No..."
          filters={[
            { label: "Type", value: type, onChange: setType, options: TYPE_OPTIONS },
            { label: "Status", value: status, onChange: setStatus, options: STATUS_OPTIONS },
          ]}
          onExport={handleExport}
        />
      </div>

      {viewing && (
        <Modal title="Scholarship Application" onClose={() => setViewing(null)}>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-semibold text-slate-700">Applicant:</span> {viewing.applicantName} (
              {viewing.applicantEmail})
            </p>
            <p>
              <span className="font-semibold text-slate-700">Scholarship:</span> {viewing.scholarshipName}
            </p>
            <p>
              <span className="font-semibold text-slate-700">Type:</span> {viewing.scholarshipType}
            </p>
            <p>
              <span className="font-semibold text-slate-700">GWA:</span> {viewing.gradeAverage}
            </p>
            <p>
              <span className="font-semibold text-slate-700">Status:</span> <StatusBadge status={viewing.status} />
            </p>
            <p>
              <span className="font-semibold text-slate-700">Submitted:</span> {formatDate(viewing.submittedAt)}
            </p>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
