import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ARCHIVABLE_STATUSES, bulkArchiveApplications, searchApplications } from "../api/adminApplicationsApi.js";
import { ApiError } from "../api/apiClient.js";
import { useToast } from "../context/ToastContext.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { StatCard } from "../components/ui/Card.jsx";
import "./AdminApplicationsPage.css";

const TERMINAL_STATUSES = new Set(["Approved", "Rejected"]);
const ARCHIVABLE_STATUS_SET = new Set(ARCHIVABLE_STATUSES);

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
  const { showToast } = useToast();
  const [filters, setFilters] = useState(initialFilters);
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBulkArchiving, setIsBulkArchiving] = useState(false);

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

  const archivableApplications = applications.filter(
    (row) => !row.isArchived && ARCHIVABLE_STATUS_SET.has(row.status),
  );
  const archivableIds = new Set(archivableApplications.map((row) => row.applicationId));
  const selectedArchivableIds = Array.from(selectedIds).filter((id) => archivableIds.has(id));
  const allArchivableSelected =
    archivableApplications.length > 0 && archivableApplications.every((row) => selectedIds.has(row.applicationId));

  function toggleSelect(applicationId, event) {
    event.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(applicationId)) {
        next.delete(applicationId);
      } else {
        next.add(applicationId);
      }
      return next;
    });
  }

  function toggleSelectAll(event) {
    event.stopPropagation();
    setSelectedIds(
      allArchivableSelected ? new Set() : new Set(archivableApplications.map((row) => row.applicationId)),
    );
  }

  async function handleBulkArchive() {
    setIsBulkArchiving(true);
    setErrorMessage(null);
    try {
      const items = applications
        .filter((row) => selectedArchivableIds.includes(row.applicationId))
        .map((row) => ({ applicationId: row.applicationId, category: row.category }));

      const result = await bulkArchiveApplications(items);
      setSelectedIds(new Set());
      await loadApplications(filters);

      if (result.failures.length === 0) {
        showToast(`${result.succeededCount} application${result.succeededCount === 1 ? "" : "s"} archived.`);
      } else {
        showToast(
          `${result.succeededCount} archived, ${result.failures.length} couldn't be archived (already handled elsewhere).`,
        );
      }
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to archive the selected applications.");
    } finally {
      setIsBulkArchiving(false);
    }
  }

  const columns = [
    {
      key: "select",
      header: (
        <input
          type="checkbox"
          checked={allArchivableSelected}
          onChange={toggleSelectAll}
          onClick={(event) => event.stopPropagation()}
          disabled={archivableApplications.length === 0}
          aria-label="Select all archivable applications"
        />
      ),
      render: (row) =>
        !row.isArchived && ARCHIVABLE_STATUS_SET.has(row.status) ? (
          <input
            type="checkbox"
            checked={selectedIds.has(row.applicationId)}
            onChange={(event) => toggleSelect(row.applicationId, event)}
            onClick={(event) => event.stopPropagation()}
            aria-label={`Select ${row.applicantName}'s application`}
          />
        ) : null,
    },
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

      {selectedArchivableIds.length > 0 && (
        <div className="admin-applications-bulk-bar">
          <span className="admin-applications-bulk-count">
            {selectedArchivableIds.length} selected
          </span>
          <div className="row-actions">
            <button type="button" className="bulk-archive-button" onClick={handleBulkArchive} disabled={isBulkArchiving}>
              {isBulkArchiving ? "Archiving..." : "Archive Selected"}
            </button>
            <button
              type="button"
              className="bulk-clear-button"
              onClick={() => setSelectedIds(new Set())}
              disabled={isBulkArchiving}
            >
              Clear
            </button>
          </div>
        </div>
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
              className="ui-input ui-datatable-search"
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
