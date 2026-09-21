import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchApplications } from "../api/adminApplicationsApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import "./AdminArchivePage.css";

const initialFilters = { search: "", category: "", program: "" };

function formatDate(isoDateTime) {
  return new Date(isoDateTime).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminArchivePage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(initialFilters);
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const loadArchivedApplications = useCallback(async (activeFilters) => {
    setIsLoading(true);
    try {
      const data = await searchApplications({ ...activeFilters, archived: true });
      setApplications(data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to load archived records.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => loadArchivedApplications(filters), 300);
    return () => clearTimeout(timeout);
  }, [filters, loadArchivedApplications]);

  const columns = [
    {
      key: "applicant",
      header: "Applicant",
      accessor: (row) => row.applicantName,
      sortable: true,
      render: (row) => (
        <div className="admin-archive-cell">
          <span className="admin-archive-name">{row.applicantName}</span>
          <span className="admin-archive-email">{row.applicantEmail}</span>
        </div>
      ),
    },
    {
      key: "category",
      header: "Type",
      accessor: (row) => row.category,
      sortable: true,
      render: (row) => (
        <span className={`category-badge category-${row.category.toLowerCase()}`}>{row.category}</span>
      ),
    },
    { key: "program", header: "Program", render: (row) => row.courseAppliedFor ?? row.scholarshipName },
    {
      key: "status",
      header: "Status",
      accessor: (row) => row.status,
      sortable: true,
      render: (row) => <StatusBadge status={row.status} adminContext />,
    },
    {
      key: "archivedAt",
      header: "Archived",
      accessor: (row) => row.archivedAt,
      sortable: true,
      render: (row) => formatDate(row.archivedAt),
    },
    { key: "archiveReason", header: "Reason", render: (row) => row.archiveReason ?? "—" },
  ];

  return (
    <AppLayout title="Records Archive">
      <Card tier="data">
        <p className="admin-archive-subtitle">
          Completed/inactive admission and scholarship applications archived to support the school's document
          disposal process. Nothing here is deleted - every record (and, for an Admission application, its
          documents) remains retrievable for the school's 5-year retention practice.
        </p>

        {errorMessage && (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        )}

        <div className="admin-archive-extra-filter">
          <input
            className="ui-input ui-datatable-search"
            type="text"
            placeholder="Filter by program / scholarship"
            value={filters.program}
            onChange={(event) => setFilters((prev) => ({ ...prev, program: event.target.value }))}
          />
        </div>

        <DataTable
          columns={columns}
          rows={applications}
          getRowKey={(row) => row.applicationId}
          isLoading={isLoading}
          emptyMessage="No archived records match these filters."
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
          ]}
        />
      </Card>
    </AppLayout>
  );
}
