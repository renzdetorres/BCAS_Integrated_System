import { useCallback, useEffect, useState } from "react";
import { searchApplications } from "../api/adminApplicationsApi.js";
import { ApiError } from "../api/apiClient.js";
import ApplicationDetailModal from "../components/ApplicationDetailModal.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import DataTable, { PersonCell, RowAction } from "../components/ui/DataTable.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { DEPARTMENT_OPTIONS } from "../config/departments.js";
import { formatDate } from "../utils/format.js";

const initialFilters = { search: "", category: "", department: "" };

/**
 * Records: the school's active, official applicant records - approved
 * applicants that haven't been archived. Rejected and finished applications
 * live under Archives.
 */
export default function AdminRecordsPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [viewing, setViewing] = useState(null);

  const load = useCallback(async (activeFilters) => {
    setIsLoading(true);
    try {
      setRecords(await searchApplications({ ...activeFilters, status: "Approved", archived: false }));
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to load records.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => load(filters), 300);
    return () => clearTimeout(timeout);
  }, [filters, load]);

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));
  const admissionCount = records.filter((row) => row.category === "Admission").length;

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
      key: "department",
      header: "Department",
      accessor: (row) => row.department ?? "",
      sortable: true,
      render: (row) => row.department ?? <span className="ui-cell-muted">Unassigned</span>,
    },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} adminContext /> },
    {
      key: "submittedAt",
      header: "Submitted",
      accessor: (row) => row.submittedAt,
      sortable: true,
      render: (row) => formatDate(row.submittedAt),
    },
    {
      key: "action",
      header: "Action",
      align: "center",
      searchable: false,
      render: (row) => (
        <RowAction label="View record" onClick={() => setViewing(row)} ariaLabel={`View ${row.applicantName}'s ${row.category.toLowerCase()} record`} />
      ),
    },
  ];

  return (
    <AppLayout>
      <DataTable
        title="Records"
        subtitle="Approved applicants: the active, official record. Rejected and finished applications are kept under Archives."
        summary={[
          { label: "Approved records", value: records.length.toLocaleString(), tone: "green" },
          { label: "Admission", value: admissionCount.toLocaleString() },
          { label: "Scholarship", value: (records.length - admissionCount).toLocaleString() },
        ]}
        columns={columns}
        rows={records}
        getRowKey={(row) => row.applicationId}
        isLoading={isLoading}
        errorMessage={errorMessage}
        emptyMessage="No approved records match these filters."
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
