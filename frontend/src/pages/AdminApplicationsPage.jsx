import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchApplications } from "../api/adminApplicationsApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { StatCard } from "../components/ui/Card.jsx";
import "./AdminApplicationsPage.css";

const TERMINAL_STATUSES = new Set(["Approved", "Rejected"]);

const initialFilters = { search: "", status: "", category: "", program: "" };

const STATUS_OPTIONS = [
  "Submitted",
  "UnderReview",
  "DocumentsVerified",
  "EligibilityScreening",
  "Evaluation",
  "Result",
  "Approved",
  "Rejected",
].map((value) => ({ value, label: value }));

function formatDate(isoDateTime) {
  return new Date(isoDateTime).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminApplicationsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(initialFilters);
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const loadApplications = useCallback(async (activeFilters) => {
    setIsLoading(true);
    try {
      const data = await searchApplications(activeFilters);
      setApplications(data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to load applications.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => loadApplications(filters), 300);
    return () => clearTimeout(timeout);
  }, [filters, loadApplications]);

  const columns = [
    {
      key: "applicant",
      header: "Applicant",
      accessor: (row) => row.applicantName,
      sortable: true,
      render: (row) => (
        <div className="admin-applications-cell">
          <span className="admin-applications-name">{row.applicantName}</span>
          <span className="admin-applications-email">{row.applicantEmail}</span>
        </div>
      ),
    },
    { key: "category", header: "Type", accessor: (row) => row.category, sortable: true },
    {
      key: "program",
      header: "Program",
      render: (row) => row.courseAppliedFor ?? row.scholarshipName,
    },
    {
      key: "status",
      header: "Status",
      accessor: (row) => row.status,
      sortable: true,
      render: (row) => <StatusBadge status={row.status} adminContext />,
    },
    {
      key: "submittedAt",
      header: "Submitted",
      accessor: (row) => row.submittedAt,
      sortable: true,
      render: (row) => formatDate(row.submittedAt),
    },
  ];

  const needsActionCount = applications.filter((row) => !TERMINAL_STATUSES.has(row.status)).length;
  const approvedCount = applications.filter((row) => row.status === "Approved").length;
  const rejectedCount = applications.filter((row) => row.status === "Rejected").length;

  return (
    <AppLayout title="Applications">
      <p className="admin-applications-subtitle">
        All admission and scholarship applications. Select one to view its full detail.
      </p>

      {errorMessage && (
        <p className="form-error" role="alert">
          {errorMessage}
        </p>
      )}

      {!isLoading && !errorMessage && (
        <section className="admin-applications-queue-summary">
          <StatCard label="Needs Action" value={needsActionCount} />
          <StatCard label="Approved" value={approvedCount} />
          <StatCard label="Rejected" value={rejectedCount} />
          <p className="admin-applications-queue-caption">
            Counts reflect the {applications.length} application{applications.length === 1 ? "" : "s"} shown below,
            not the full archive.
          </p>
        </section>
      )}

      <div className="admin-applications-panel">
        <DataTable
          columns={columns}
          rows={applications}
          getRowKey={(row) => row.applicationId}
          isLoading={isLoading}
          emptyMessage="No applications match these filters."
          onRowClick={(row) => navigate(`/admin/applications/${row.applicationId}`)}
          search={{
            value: filters.search,
            onChange: (value) => setFilters((prev) => ({ ...prev, search: value })),
            placeholder: "Search by applicant name or email",
          }}
          filters={[
            {
              key: "category",
              label: "All types",
              value: filters.category,
              onChange: (value) => setFilters((prev) => ({ ...prev, category: value })),
              options: [
                { value: "Admission", label: "Admission" },
                { value: "Scholarship", label: "Scholarship" },
              ],
            },
            {
              key: "status",
              label: "All statuses",
              value: filters.status,
              onChange: (value) => setFilters((prev) => ({ ...prev, status: value })),
              options: STATUS_OPTIONS,
            },
          ]}
          extraToolbar={
            <input
              className="ui-datatable-search"
              type="text"
              placeholder="Filter by program / scholarship"
              value={filters.program}
              onChange={(event) => setFilters((prev) => ({ ...prev, program: event.target.value }))}
            />
          }
        />
      </div>
    </AppLayout>
  );
}
