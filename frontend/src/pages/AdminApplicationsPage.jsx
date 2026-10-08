import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ARCHIVABLE_STATUSES, bulkArchiveApplications, searchApplications } from "../api/adminApplicationsApi.js";
import { ApiError } from "../api/apiClient.js";
import { useToast } from "../context/ToastContext.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import ApplicationDetailModal from "../components/ApplicationDetailModal.jsx";
import DataTable, { RowAction } from "../components/ui/DataTable.jsx";
import StatusBadge, { statusLabel } from "../components/ui/StatusBadge.jsx";
import StatusLegend from "../components/ui/StatusLegend.jsx";
import { DEPARTMENT_OPTIONS } from "../config/departments.js";
import { ADMISSION_STATUSES, SCHOLARSHIP_STATUSES, statusDescription } from "../config/statusDescriptions.js";
import "./AdminApplicationsPage.css";

const ARCHIVABLE_STATUS_SET = new Set(ARCHIVABLE_STATUSES);

// Filters live in the URL, so the sidebar's department links, the dashboard
// and the top-bar search can all deep-link into a filtered list, and the
// sidebar can tell which department view is active.
const FILTER_KEYS = ["search", "status", "category", "program", "department"];

const DEPARTMENT_FILTER_OPTIONS = [
  ...DEPARTMENT_OPTIONS.map((department) => ({ value: department, label: department })),
  { value: "Unassigned", label: "Unassigned" },
];

// The status filter only offers statuses the chosen type can actually have.
function statusOptionsFor(category) {
  const lists = category === "Admission" ? [ADMISSION_STATUSES] : category === "Scholarship" ? [SCHOLARSHIP_STATUSES] : [ADMISSION_STATUSES, SCHOLARSHIP_STATUSES];
  const values = [...new Set(lists.flat().map((s) => s.value))];
  return values.map((value) => ({ value, label: statusLabel(value) }));
}

// The "?" guide mirrors the same choice. "Submitted" is left out: it is the
// automatic starting status and needs no explaining.
function legendGroupsFor(category) {
  const without = (list) => list.filter((s) => s.value !== "Submitted");
  if (category === "Admission") return [{ statuses: without(ADMISSION_STATUSES) }];
  if (category === "Scholarship") return [{ statuses: without(SCHOLARSHIP_STATUSES) }];
  return [
    { title: "Admission", statuses: without(ADMISSION_STATUSES) },
    { title: "Scholarship", statuses: without(SCHOLARSHIP_STATUSES).filter((s) => !["Approved", "Rejected"].includes(s.value)) },
  ];
}

function formatDate(isoDateTime) {
  return new Date(isoDateTime).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminApplicationsPage() {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterQuery = FILTER_KEYS.map((key) => searchParams.get(key) ?? "").join("\u0000");
  // Keyed on the joined values so the debounced reload below only fires
  // when a filter actually changes, not on every render.
  const filters = useMemo(() => {
    const values = filterQuery.split("\u0000");
    return Object.fromEntries(FILTER_KEYS.map((key, index) => [key, values[index]]));
  }, [filterQuery]);

  // One update for any number of keys: two separate setSearchParams calls in the
  // same tick would each start from the same stale params.
  function setFilters(updates) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(updates)) {
          if (value) {
            next.set(key, value);
          } else {
            next.delete(key);
          }
        }
        return next;
      },
      { replace: true },
    );
  }

  function setFilter(key, value) {
    setFilters({ [key]: value });
  }
  const [loaded, setLoaded] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBulkArchiving, setIsBulkArchiving] = useState(false);
  const [viewing, setViewing] = useState(null);

  const loadApplications = useCallback(async (activeFilters) => {
    setIsLoading(true);
    try {
      const { status: _status, ...serverFilters } = activeFilters;
      const data = await searchApplications(serverFilters);
      setLoaded(data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to load applications.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Status is applied in the browser, so changing it never refetches.
  useEffect(() => {
    const timeout = setTimeout(() => loadApplications(filters), 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search, filters.category, filters.program, filters.department, loadApplications]);

  // Most recently active first (last updated, then submitted).
  const applications = useMemo(() => {
    const shown = filters.status ? loaded.filter((row) => row.status === filters.status) : loaded;
    return [...shown].sort((a, b) => (b.updatedAt ?? b.submittedAt).localeCompare(a.updatedAt ?? a.submittedAt));
  }, [loaded, filters.status]);

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
      searchable: false,
      width: "44px",
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
      key: "department",
      header: "Department",
      accessor: (row) => row.department ?? "",
      sortable: true,
      render: (row) => row.department ?? <span className="applications-department-missing">Unassigned</span>,
    },
    {
      key: "status",
      header: (
        <span className="admin-applications-status-head">
          Status
          <StatusLegend groups={legendGroupsFor(filters.category)} adminContext />
        </span>
      ),
      accessor: (row) => row.status,
      render: (row) => <StatusBadge status={row.status} adminContext hint={statusDescription(row.status)} />,
    },
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
        <RowAction
          label="View Application"
          onClick={() => setViewing(row)}
          ariaLabel={`View ${row.applicantName}'s ${row.category.toLowerCase()} application`}
        />
      ),
    },
  ];

  const unassignedCount = loaded.filter((row) => !row.department).length;
  const underReviewCount = loaded.filter((row) => row.status === "UnderReview").length;
  const newCount = loaded.filter((row) => row.status === "Submitted").length;

  const bulkActions =
    selectedArchivableIds.length > 0 ? (
      <div className="admin-applications-bulk" role="status">
        <span className="admin-applications-bulk-count">{selectedArchivableIds.length} selected</span>
        <button type="button" className="btn btn-secondary" onClick={() => setSelectedIds(new Set())} disabled={isBulkArchiving}>
          Clear
        </button>
        <button type="button" className="btn btn-danger" onClick={handleBulkArchive} disabled={isBulkArchiving}>
          {isBulkArchiving ? "Archiving..." : "Archive selected"}
        </button>
      </div>
    ) : null;

  return (
    <AppLayout>
      <DataTable
        title="Applications"
        subtitle="Every admission and scholarship application. Select one to read it in full."
        actions={bulkActions}
        summary={[
          {
            label: "Unassigned",
            value: unassignedCount.toLocaleString(),
            tone: "red",
            active: filters.department === "Unassigned",
            onClick: () => setFilter("department", filters.department === "Unassigned" ? "" : "Unassigned"),
          },
          {
            label: "Under review",
            value: underReviewCount.toLocaleString(),
            tone: "amber",
            active: filters.status === "UnderReview",
            onClick: () => setFilter("status", filters.status === "UnderReview" ? "" : "UnderReview"),
          },
          {
            label: "New applications",
            value: newCount.toLocaleString(),
            tone: "amber",
            active: filters.status === "Submitted",
            onClick: () => setFilter("status", filters.status === "Submitted" ? "" : "Submitted"),
          },
        ]}
        summaryNote="Select a card to filter the list. Unassigned means no department has been set yet."
        columns={columns}
        rows={applications}
        getRowKey={(row) => row.applicationId}
        isLoading={isLoading}
        errorMessage={errorMessage}
        emptyMessage="No applications match these filters."
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
            // A status that belongs to the other type would match nothing, so reset it.
            onChange: (value) =>
              setFilters({
                category: value,
                ...(filters.status && !statusOptionsFor(value).some((o) => o.value === filters.status) ? { status: "" } : {}),
              }),
            options: [
              { value: "Admission", label: "Admission" },
              { value: "Scholarship", label: "Scholarship" },
            ],
          },
          {
            key: "status",
            label: "All statuses",
            value: filters.status,
            onChange: (value) => setFilter("status", value),
            options: statusOptionsFor(filters.category),
          },
          {
            key: "department",
            label: "All departments",
            value: filters.department,
            onChange: (value) => setFilter("department", value),
            options: DEPARTMENT_FILTER_OPTIONS,
          },
        ]}
      />

      <ApplicationDetailModal application={viewing} onClose={() => setViewing(null)} />
    </AppLayout>
  );
}
