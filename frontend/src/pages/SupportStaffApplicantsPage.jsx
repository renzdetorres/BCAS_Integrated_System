import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { searchApplicants } from "../api/supportStaffApplicantsApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import "./SupportStaffApplicantsPage.css";

function formatDate(isoDateTime) {
  if (!isoDateTime) return "—";
  return new Date(isoDateTime).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function SupportStaffApplicantsPage() {
  const [search, setSearch] = useState("");
  const [applicants, setApplicants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const loadApplicants = useCallback(async (activeSearch) => {
    setIsLoading(true);
    try {
      const data = await searchApplicants({ search: activeSearch });
      setApplicants(data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to load applicant records.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => loadApplicants(search.trim()), 300);
    return () => clearTimeout(timeout);
  }, [search, loadApplicants]);

  const columns = [
    {
      key: "name",
      header: "Name",
      accessor: (row) => `${row.firstName} ${row.lastName}`,
      sortable: true,
      render: (row) => `${row.firstName} ${row.lastName}`,
    },
    { key: "email", header: "Email", sortable: true },
    {
      key: "application",
      header: "Application",
      render: (row) =>
        row.applicationType ? (
          <div className="ss-applicants-cell">
            <span className="ss-applicants-app-type">{row.applicationType}</span>
            <span className="ss-applicants-app-course">{row.courseAppliedFor}</span>
          </div>
        ) : (
          <span className="ss-applicants-no-application">No application yet</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      accessor: (row) => row.applicationStatus,
      sortable: true,
      render: (row) => (row.applicationStatus ? <StatusBadge status={row.applicationStatus} /> : "—"),
    },
    {
      key: "submittedAt",
      header: "Submitted",
      accessor: (row) => row.submittedAt,
      sortable: true,
      render: (row) => formatDate(row.submittedAt),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <Link className="ss-applicants-verify-link" to={`/support-staff/documents?applicantId=${row.userId}`}>
          View Documents
        </Link>
      ),
    },
  ];

  return (
    <AppLayout title="Applicant Records">
      <Card>
        <p className="ss-applicants-subtitle">
          Search applicants by name or email, view their admission application info, and jump directly into
          Document Verification for one.
        </p>

        {errorMessage && (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        )}

        <DataTable
          columns={columns}
          rows={applicants}
          getRowKey={(row) => row.userId}
          isLoading={isLoading}
          emptyMessage="No applicant records match this search."
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Search by name or email",
          }}
        />
      </Card>
    </AppLayout>
  );
}
