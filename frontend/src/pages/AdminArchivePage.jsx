import { useCallback, useEffect, useState } from "react";
import { ARCHIVABLE_STATUSES, searchApplications } from "../api/adminApplicationsApi.js";
import { ApiError } from "../api/apiClient.js";
import ApplicationDetailModal from "../components/ApplicationDetailModal.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import DataTable, { PersonCell, RowAction } from "../components/ui/DataTable.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { DEPARTMENT_OPTIONS } from "../config/departments.js";
import { formatDate } from "../utils/format.js";
import "./AdminArchivePage.css";

const initialFilters = { search: "", category: "", status: "", department: "" };

export default function AdminArchivePage() {
  const [filters, setFilters] = useState(initialFilters);
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [viewing, setViewing] = useState(null);

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

  function setFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const columns = [
    {
      key: "applicant",
      header: "Applicant",
      accessor: (row) => row.applicantName,
      sortable: true,
      render: (row) => <PersonCell name={row.applicantName} detail={row.applicantEmail} />,
    },
    {
      key: "program",
      header: "Application",
      accessor: (row) => row.courseAppliedFor ?? row.scholarshipName,
      sortable: true,
      render: (row) => <PersonCell name={row.courseAppliedFor ?? row.scholarshipName} detail={row.category} />,
    },
    {
      key: "status",
      header: "Final status",
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
    {
      key: "archiveReason",
      header: "Reason",
      render: (row) =>
        row.archiveReason ? (
          <span className="admin-archive-reason">{row.archiveReason}</span>
        ) : (
          <span className="ui-cell-muted">-</span>
        ),
    },
    {
      key: "action",
      header: "Action",
      align: "center",
      searchable: false,
      render: (row) => (
        <RowAction
          label="View record"
          onClick={() => setViewing(row)}
          ariaLabel={`View ${row.applicantName}'s archived ${row.category.toLowerCase()} application`}
        />
      ),
    },
  ];

  return (
    <AppLayout>
      <DataTable
        title="Archives"
        subtitle="Finished applications, such as rejected ones and old completed ones, moved out of the working list. Active approved applicants are under Records. Nothing here is deleted: every record, and an admission application's documents, stays retrievable for the school's 5-year retention."
        columns={columns}
        rows={applications}
        getRowKey={(row) => row.applicationId}
        isLoading={isLoading}
        errorMessage={errorMessage}
        emptyMessage="No archived records match these filters."
        onRowClick={(row) => setViewing(row)}
        search={{
          value: filters.search,
          onChange: (value) => setFilter("search", value),
          placeholder: "Search by name, email, or program",
        }}
        filters={[
          {
            key: "category",
            label: "All types",
            value: filters.category,
            onChange: (value) => setFilter("category", value),
            options: [
              { value: "Admission", label: "Admission" },
              { value: "Scholarship", label: "Scholarship" },
            ],
          },
          {
            key: "status",
            label: "Any final status",
            value: filters.status,
            onChange: (value) => setFilter("status", value),
            options: ARCHIVABLE_STATUSES.map((status) => ({ value: status, label: status })),
          },
          {
            key: "department",
            label: "All departments",
            value: filters.department,
            onChange: (value) => setFilter("department", value),
            options: [...DEPARTMENT_OPTIONS, "Unassigned"].map((d) => ({ value: d, label: d })),
          },
        ]}
      />

      <ApplicationDetailModal application={viewing} onClose={() => setViewing(null)} />
    </AppLayout>
  );
}
