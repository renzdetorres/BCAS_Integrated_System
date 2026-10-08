import { useCallback, useEffect, useState } from "react";
import { getOpenDuplicateFlags, resolveDuplicateFlag } from "../api/duplicateApplicantsApi.js";
import { ApiError } from "../api/apiClient.js";
import { useToast } from "../context/ToastContext.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import DataTable, { PersonCell } from "../components/ui/DataTable.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { formatDate, formatDateTime } from "../utils/format.js";
import "./AdminDuplicateApplicantsPage.css";

/** What the matched (existing) account already has, so staff can compare before deciding. */
function ExistingApplication({ flag }) {
  if (!flag.matchedApplicationId) {
    return <span className="ui-cell-muted">No application yet</span>;
  }
  return (
    <div className="duplicate-existing">
      <div className="duplicate-existing-line">
        <StatusBadge status={flag.matchedApplicationStatus} adminContext />
        <span>
          {flag.matchedCourseAppliedFor}
          {flag.matchedDepartment ? ` \u00b7 ${flag.matchedDepartment}` : ""}
        </span>
      </div>
      <span className="duplicate-existing-meta">
        Submitted {formatDate(flag.matchedSubmittedAt)} {" \u00b7 "}{flag.matchedDocumentsVerified} of {flag.matchedDocumentsUploaded} documents verified
      </span>
    </div>
  );
}

export default function AdminDuplicateApplicantsPage() {
  const { showToast } = useToast();
  const [flags, setFlags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [pendingFlagId, setPendingFlagId] = useState(null);

  const loadFlags = useCallback(async () => {
    setIsLoading(true);
    try {
      setFlags(await getOpenDuplicateFlags());
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to load duplicate-applicant flags.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFlags();
  }, [loadFlags]);

  async function handleResolve(flag, status) {
    setPendingFlagId(flag.flagId);
    try {
      await resolveDuplicateFlag(flag.flagId, { status });
      setFlags((prev) => prev.filter((f) => f.flagId !== flag.flagId));
      showToast(status === "Dismissed" ? "Flag dismissed - not a duplicate." : "Marked as a confirmed duplicate.");
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "Failed to resolve this flag.", "error");
    } finally {
      setPendingFlagId(null);
    }
  }

  const columns = [
    {
      key: "newUser",
      header: "New registration",
      accessor: (row) => `${row.newUserName} ${row.newUserEmail}`,
      sortable: true,
      render: (row) => <PersonCell name={row.newUserName} detail={row.newUserEmail} />,
    },
    {
      key: "matched",
      header: "Matches existing account",
      accessor: (row) => `${row.matchedUserName} ${row.matchedUserEmail}`,
      sortable: true,
      render: (row) => <PersonCell name={row.matchedUserName} detail={row.matchedUserEmail} />,
    },
    {
      key: "existing",
      header: "Their existing application",
      searchable: false,
      render: (row) => <ExistingApplication flag={row} />,
    },
    {
      key: "detectedAt",
      header: "Detected",
      accessor: (row) => row.detectedAt,
      sortable: true,
      searchable: false,
      render: (row) => formatDateTime(row.detectedAt),
    },
    {
      key: "action",
      header: "Action",
      align: "center",
      searchable: false,
      render: (row) => (
        <div className="duplicate-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleResolve(row, "Dismissed")} disabled={pendingFlagId === row.flagId}>
            Dismiss
          </button>
          <button type="button" className="btn btn-danger btn-sm" onClick={() => handleResolve(row, "ConfirmedDuplicate")} disabled={pendingFlagId === row.flagId}>
            Confirm duplicate
          </button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      <DataTable
        title="Duplicate Applicants"
        subtitle="A close name match against an existing applicant account was found at registration. Nothing is blocked or merged automatically. Compare with the existing account's application and documents, then dismiss it (a coincidence) or confirm the duplicate to follow up on manually."
        columns={columns}
        rows={flags}
        getRowKey={(row) => row.flagId}
        isLoading={isLoading}
        errorMessage={errorMessage}
        emptyMessage="No potential duplicates awaiting review."
        searchPlaceholder="Search by name or email"
      />
    </AppLayout>
  );
}
