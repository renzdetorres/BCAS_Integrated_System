import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ARCHIVABLE_STATUSES,
  archiveApplication,
  getApplicationStatusHistory,
  getValidNextAdmissionStatuses,
  getValidNextScholarshipStatuses,
  promoteFromWaitlist,
  searchApplications,
  updateApplicationStatus,
} from "../api/adminApplicationsApi.js";
import { ApiError } from "../api/apiClient.js";
import WorkflowStepper, { ADMISSION_STEP_LABELS, SCHOLARSHIP_STEP_LABELS } from "../components/WorkflowStepper.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import "./AdminApplicationDetailPage.css";

function formatDateTime(isoDateTime) {
  return new Date(isoDateTime).toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminApplicationDetailPage() {
  const { applicationId } = useParams();
  const [application, setApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const [statusForm, setStatusForm] = useState({ status: "", remarks: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [savedMessage, setSavedMessage] = useState(null);

  const [archiveReason, setArchiveReason] = useState("");
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState(null);

  const [isPromoting, setIsPromoting] = useState(false);
  const [promoteError, setPromoteError] = useState(null);

  const [statusHistory, setStatusHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState(null);

  const loadApplication = useCallback(() => {
    let cancelled = false;

    setIsLoading(true);
    searchApplications()
      .then((data) => {
        if (cancelled) return;
        const found = data.find((a) => a.applicationId === applicationId) ?? null;
        setApplication(found);
        if (found) {
          setStatusForm({ status: found.status, remarks: found.remarks ?? "" });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof ApiError ? error.message : "Failed to load this application.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  useEffect(() => loadApplication(), [loadApplication]);

  const loadStatusHistory = useCallback(() => {
    if (!application) return undefined;

    let cancelled = false;
    setIsLoadingHistory(true);
    getApplicationStatusHistory(applicationId, application.category)
      .then((data) => {
        if (!cancelled) setStatusHistory(data);
      })
      .catch((error) => {
        if (!cancelled) {
          setHistoryError(error instanceof ApiError ? error.message : "Failed to load status history.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingHistory(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applicationId, application?.category]);

  useEffect(() => loadStatusHistory(), [loadStatusHistory]);

  async function handleStatusSubmit(event) {
    event.preventDefault();
    setSaveError(null);
    setSavedMessage(null);

    if (statusForm.status === application.status) {
      setSaveError("Choose a different status to record a change.");
      return;
    }

    setIsSaving(true);

    try {
      const updated = await updateApplicationStatus(applicationId, {
        category: application.category,
        status: statusForm.status,
        remarks: statusForm.remarks.trim() === "" ? null : statusForm.remarks,
      });
      setApplication(updated);
      setStatusForm({ status: updated.status, remarks: updated.remarks ?? "" });
      setSavedMessage("Status updated.");
      loadStatusHistory();
    } catch (error) {
      setSaveError(error instanceof ApiError ? error.message : "Failed to update the application's status.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePromoteFromWaitlist() {
    setPromoteError(null);
    setIsPromoting(true);

    try {
      const promoted = await promoteFromWaitlist(applicationId);
      setApplication(promoted);
      setStatusForm({ status: promoted.status, remarks: promoted.remarks ?? "" });
      loadStatusHistory();
    } catch (error) {
      setPromoteError(error instanceof ApiError ? error.message : "Failed to promote this application from the waitlist.");
    } finally {
      setIsPromoting(false);
    }
  }

  async function handleArchiveSubmit(event) {
    event.preventDefault();
    setArchiveError(null);
    setIsArchiving(true);

    try {
      const archived = await archiveApplication(applicationId, {
        category: application.category,
        reason: archiveReason.trim() === "" ? null : archiveReason,
      });
      setApplication(archived);
      setArchiveReason("");
    } catch (error) {
      setArchiveError(error instanceof ApiError ? error.message : "Failed to archive this application.");
    } finally {
      setIsArchiving(false);
    }
  }

  // The Update Status dropdown only offers the current status (so it stays
  // visible/selected) plus valid forward moves through that category's
  // ordered workflow (BISAASS-56 Admission, BISAASS-57 Scholarship).
  const statusOptions = application
    ? [
        application.status,
        ...(application.category === "Admission"
          ? getValidNextAdmissionStatuses(application.status)
          : getValidNextScholarshipStatuses(application.status)),
      ]
    : [];
  const stepLabels = application?.category === "Admission" ? ADMISSION_STEP_LABELS : SCHOLARSHIP_STEP_LABELS;
  const canArchive = application && !application.isArchived && ARCHIVABLE_STATUSES.includes(application.status);
  const isWaitlisted = application?.category === "Scholarship" && application.status === "Waitlisted";

  return (
    <AppLayout
      title="Application Detail"
      actions={
        <Link className="admin-app-detail-back-link" to="/admin/applications">
          &larr; Back to applications
        </Link>
      }
    >
        {isLoading && (
          <div className="admin-app-detail-card">
            <p>Loading...</p>
          </div>
        )}
        {errorMessage && (
          <div className="admin-app-detail-card">
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          </div>
        )}
        {!isLoading && !errorMessage && !application && (
          <div className="admin-app-detail-card">
            <p>Application not found.</p>
          </div>
        )}

        {!isLoading && !errorMessage && application && (
          <>
            {/* One record overview, not three separate cards for identity,
                workflow state, and history - a registrar reads all three
                together to understand "where this record stands" before
                touching either action below. Sections divided by a rule,
                same dossier pattern used on the scholarship review pages. */}
            <div className="admin-app-detail-card admin-app-dossier">
              <div className="admin-app-dossier-section">
                <div className="admin-app-detail-header">
                  <span className={`category-badge category-${application.category.toLowerCase()}`}>
                    {application.category}
                  </span>
                  <StatusBadge status={application.status} adminContext />
                  {application.isArchived && <StatusBadge status="Inactive" label="Archived" />}
                </div>
                <p className="admin-app-detail-name">{application.applicantName}</p>
                <p className="admin-app-detail-email">{application.applicantEmail}</p>

                <dl className="admin-app-detail-list">
                  {application.category === "Admission" ? (
                    <>
                      <div>
                        <dt>Application Type</dt>
                        <dd>{application.applicationType}</dd>
                      </div>
                      <div>
                        <dt>Course Applied For</dt>
                        <dd>{application.courseAppliedFor}</dd>
                      </div>
                      {application.previousSchool && (
                        <div>
                          <dt>Previous School</dt>
                          <dd>{application.previousSchool}</dd>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div>
                        <dt>Scholarship</dt>
                        <dd>{application.scholarshipName}</dd>
                      </div>
                      <div>
                        <dt>Scholarship Type</dt>
                        <dd>{application.scholarshipType}</dd>
                      </div>
                      <div>
                        <dt>Grade Average</dt>
                        <dd>{application.gradeAverage}</dd>
                      </div>
                    </>
                  )}
                  <div>
                    <dt>Submitted</dt>
                    <dd>{formatDateTime(application.submittedAt)}</dd>
                  </div>
                  <div>
                    <dt>Last Updated</dt>
                    <dd>{formatDateTime(application.updatedAt)}</dd>
                  </div>
                </dl>
              </div>

              <div className="admin-app-dossier-section">
                <h2>Workflow Status</h2>
                <WorkflowStepper steps={application.steps} labels={stepLabels} />
                {application.remarks && (
                  <p className="admin-app-detail-remarks">
                    <strong>Remarks:</strong> {application.remarks}
                  </p>
                )}
              </div>

              <div className="admin-app-dossier-section">
                <h2>Status History</h2>
                <p className="admin-app-detail-subtitle">
                  Every status change recorded for this application, oldest first.
                </p>

                {isLoadingHistory && <p>Loading...</p>}
                {historyError && (
                  <p className="form-error" role="alert">
                    {historyError}
                  </p>
                )}
                {!isLoadingHistory && !historyError && statusHistory.length === 0 && <p>No status changes recorded yet.</p>}

                {!isLoadingHistory && !historyError && statusHistory.length > 0 && (
                  <ul className="admin-app-status-history">
                    {statusHistory.map((entry) => (
                      <li key={entry.historyId}>
                        <div className="admin-app-status-history-line">
                          <strong>{entry.fromStatus ? `${entry.fromStatus} → ${entry.toStatus}` : `${entry.toStatus} (submitted)`}</strong>
                          <span>{formatDateTime(entry.changedAt)}</span>
                        </div>
                        <div className="admin-app-status-history-meta">
                          by {entry.changedByName ?? "the applicant"}
                          {entry.remarks && <> &mdash; {entry.remarks}</>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {isWaitlisted && (
              <div className="admin-app-detail-card">
                <h2>Waitlist</h2>
                <p className="admin-app-detail-subtitle">
                  This scholarship was full when the applicant applied, so the application is holding a place on
                  the waitlist instead of a reserved slot. Promoting it only succeeds if a slot has actually opened
                  up since (another applicant was rejected or archived) - it then reserves that slot and moves the
                  application into the regular screening workflow, starting at Submitted.
                </p>

                {promoteError && (
                  <p className="form-error" role="alert">
                    {promoteError}
                  </p>
                )}

                <button type="button" onClick={handlePromoteFromWaitlist} disabled={isPromoting}>
                  {isPromoting ? "Promoting..." : "Promote from Waitlist"}
                </button>
              </div>
            )}

            <div className="admin-app-detail-card">
              <h2>Update Status</h2>
              <p className="admin-app-detail-subtitle">
                {isWaitlisted
                  ? "Waitlisted applications can only move forward through the dedicated Promote from Waitlist action above, which reserves a slot atomically - this generic control is disabled while waitlisted."
                  : "Authorized staff can set this application to any status in its workflow and attach an optional remark."}
              </p>

              {savedMessage && (
                <p className="form-success" role="status">
                  {savedMessage}
                </p>
              )}
              {saveError && (
                <p className="form-error" role="alert">
                  {saveError}
                </p>
              )}

              <form onSubmit={handleStatusSubmit} noValidate>
                <div className="form-row">
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    name="status"
                    value={statusForm.status}
                    disabled={isWaitlisted}
                    onChange={(event) => setStatusForm((prev) => ({ ...prev, status: event.target.value }))}
                  >
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <label htmlFor="remarks">Remarks (optional)</label>
                  <textarea
                    id="remarks"
                    name="remarks"
                    rows={3}
                    maxLength={1000}
                    value={statusForm.remarks}
                    onChange={(event) => setStatusForm((prev) => ({ ...prev, remarks: event.target.value }))}
                  />
                </div>

                <button type="submit" disabled={isSaving || isWaitlisted}>
                  {isSaving ? "Saving..." : "Update Status"}
                </button>
              </form>
            </div>

            <div className="admin-app-detail-card">
              <h2>Records Archive</h2>
              {application.isArchived ? (
                <>
                  <p className="admin-app-detail-subtitle">
                    Archived {formatDateTime(application.archivedAt)}. The record and its documents remain
                    retrievable and are not deleted, supporting the school's 5-year retention practice.
                  </p>
                  {application.archiveReason && (
                    <p className="admin-app-detail-remarks">
                      <strong>Reason:</strong> {application.archiveReason}
                    </p>
                  )}
                </>
              ) : canArchive ? (
                <>
                  <p className="admin-app-detail-subtitle">
                    Archive this completed application to support the school's document disposal process.
                    Archiving never deletes the record - it stays retrievable for the 5-year retention practice.
                  </p>

                  {archiveError && (
                    <p className="form-error" role="alert">
                      {archiveError}
                    </p>
                  )}

                  <form onSubmit={handleArchiveSubmit} noValidate>
                    <div className="form-row">
                      <label htmlFor="archiveReason">Reason (optional)</label>
                      <textarea
                        id="archiveReason"
                        name="archiveReason"
                        rows={2}
                        maxLength={500}
                        value={archiveReason}
                        onChange={(event) => setArchiveReason(event.target.value)}
                      />
                    </div>

                    <button type="submit" className="archive-submit-button" disabled={isArchiving}>
                      {isArchiving ? "Archiving..." : "Archive Application"}
                    </button>
                  </form>
                </>
              ) : (
                <p className="admin-app-detail-subtitle">
                  Only completed applications (Approved or Rejected) can be archived.
                </p>
              )}
            </div>
          </>
        )}
    </AppLayout>
  );
}
