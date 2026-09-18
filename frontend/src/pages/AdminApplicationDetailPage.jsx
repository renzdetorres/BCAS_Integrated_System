import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ADMISSION_STATUSES,
  ARCHIVABLE_STATUSES,
  SCHOLARSHIP_STATUSES,
  archiveApplication,
  searchApplications,
  updateApplicationStatus,
} from "../api/adminApplicationsApi.js";
import { ApiError } from "../api/apiClient.js";
import WorkflowStepper, { ADMISSION_STEP_LABELS, SCHOLARSHIP_STEP_LABELS } from "../components/WorkflowStepper.jsx";
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

  async function handleStatusSubmit(event) {
    event.preventDefault();
    setSaveError(null);
    setSavedMessage(null);
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
    } catch (error) {
      setSaveError(error instanceof ApiError ? error.message : "Failed to update the application's status.");
    } finally {
      setIsSaving(false);
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

  const statusOptions = application?.category === "Admission" ? ADMISSION_STATUSES : SCHOLARSHIP_STATUSES;
  const stepLabels = application?.category === "Admission" ? ADMISSION_STEP_LABELS : SCHOLARSHIP_STEP_LABELS;
  const canArchive = application && !application.isArchived && ARCHIVABLE_STATUSES.includes(application.status);

  return (
    <main className="admin-app-detail-page">
      <div className="admin-app-detail-shell">
        <Link className="admin-app-detail-back-link" to="/admin/applications">
          &larr; Back to applications
        </Link>

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
            <div className="admin-app-detail-card">
              <div className="admin-app-detail-header">
                <span className={`category-badge category-${application.category.toLowerCase()}`}>
                  {application.category}
                </span>
                <span className={`status-badge status-${application.status.toLowerCase()}`}>
                  {application.status}
                </span>
                {application.isArchived && <span className="archived-badge">Archived</span>}
              </div>
              <h1>{application.applicantName}</h1>
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

            <div className="admin-app-detail-card">
              <h2>Workflow Status</h2>
              <WorkflowStepper steps={application.steps} labels={stepLabels} />
              {application.remarks && (
                <p className="admin-app-detail-remarks">
                  <strong>Remarks:</strong> {application.remarks}
                </p>
              )}
            </div>

            <div className="admin-app-detail-card">
              <h2>Update Status</h2>
              <p className="admin-app-detail-subtitle">
                Authorized staff can set this application to any status in its workflow and attach an optional
                remark.
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

                <button type="submit" disabled={isSaving}>
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

                    <button type="submit" disabled={isArchiving}>
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
      </div>
    </main>
  );
}
