import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AppShell from "../components/layout/AppShell.jsx";
import Card from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import Stepper from "../components/ui/Stepper.jsx";
import { inputClasses, labelClasses, primaryButtonClasses } from "../lib/formStyles.js";
import {
  ARCHIVABLE_STATUSES,
  archiveApplication,
  getApplicationStatusHistory,
  getValidNextAdmissionStatuses,
  getValidNextScholarshipStatuses,
  searchApplications,
  updateApplicationStatus,
} from "../api/adminApplicationsApi.js";
import { ApiError } from "../api/apiClient.js";

const ADMISSION_STEP_LABELS = {
  Submitted: "Submitted",
  DocumentsReceived: "Documents Received",
  UnderReview: "Under Review",
  ExamScheduled: "Exam Scheduled",
  ExamCompleted: "Exam Completed",
  DecisionReleased: "Decision Released",
};

const SCHOLARSHIP_STEP_LABELS = {
  Submitted: "Submitted",
  DocumentsVerified: "Documents Verified",
  EligibilityScreening: "Eligibility Screening",
  Evaluation: "Evaluation",
  Result: "Result",
};

function toStepperSteps(steps, labels) {
  return steps.map((step) => ({
    name: labels[step.step] ?? step.step,
    state: step.isComplete ? "done" : step.isCurrent ? "current" : "upcoming",
  }));
}

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

  return (
    <AppShell>
      <Link
        to="/admin/applications"
        className="inline-flex items-center gap-1 text-sm font-semibold text-forest hover:underline"
      >
        <ArrowLeft size={16} /> Back to applications
      </Link>

      {isLoading && <p className="mt-6 text-sm text-slate-400">Loading...</p>}
      {errorMessage && (
        <p className="mt-6 text-sm font-medium text-status-red" role="alert">
          {errorMessage}
        </p>
      )}
      {!isLoading && !errorMessage && !application && (
        <p className="mt-6 text-sm text-slate-400">Application not found.</p>
      )}

      {!isLoading && !errorMessage && application && (
        <>
          <Card className="mt-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                {application.category}
              </span>
              <StatusBadge status={application.status} />
              {application.isArchived && (
                <span className="rounded-full border border-slate-300 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                  Archived
                </span>
              )}
            </div>
            <h1 className="mt-2 text-2xl font-extrabold text-slate-900">{application.applicantName}</h1>
            <p className="text-sm text-slate-500">{application.applicantEmail}</p>

            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {application.category === "Admission" ? (
                <>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Application Type</dt>
                    <dd className="mt-1 text-sm text-slate-800">{application.applicationType}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Course Applied For</dt>
                    <dd className="mt-1 text-sm text-slate-800">{application.courseAppliedFor}</dd>
                  </div>
                  {application.previousSchool && (
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Previous School</dt>
                      <dd className="mt-1 text-sm text-slate-800">{application.previousSchool}</dd>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scholarship</dt>
                    <dd className="mt-1 text-sm text-slate-800">{application.scholarshipName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scholarship Type</dt>
                    <dd className="mt-1 text-sm text-slate-800">{application.scholarshipType}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Grade Average</dt>
                    <dd className="mt-1 text-sm text-slate-800">{application.gradeAverage}</dd>
                  </div>
                </>
              )}
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Submitted</dt>
                <dd className="mt-1 text-sm text-slate-800">{formatDateTime(application.submittedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-slate-800">{formatDateTime(application.updatedAt)}</dd>
              </div>
            </dl>
          </Card>

          <Card className="mt-6">
            <h2 className="font-bold text-slate-900">Workflow Status</h2>
            <div className="mt-4">
              <Stepper steps={toStepperSteps(application.steps, stepLabels)} />
            </div>
            {application.remarks && (
              <p className="mt-2 text-sm text-slate-600">
                <strong className="font-semibold text-slate-800">Remarks:</strong> {application.remarks}
              </p>
            )}
          </Card>

          <Card className="mt-6">
            <h2 className="font-bold text-slate-900">Update Status</h2>
            <p className="mt-1 text-sm text-slate-500">
              Authorized staff can set this application to any status in its workflow and attach an optional remark.
            </p>

            <form onSubmit={handleStatusSubmit} noValidate className="mt-4 space-y-4">
              <div>
                <label className={labelClasses} htmlFor="status">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  className={inputClasses}
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

              <div>
                <label className={labelClasses} htmlFor="remarks">
                  Remarks (optional)
                </label>
                <textarea
                  id="remarks"
                  name="remarks"
                  rows={3}
                  maxLength={1000}
                  className={inputClasses}
                  value={statusForm.remarks}
                  onChange={(event) => setStatusForm((prev) => ({ ...prev, remarks: event.target.value }))}
                />
              </div>

              {savedMessage && (
                <p className="text-sm font-medium text-status-green" role="status">
                  {savedMessage}
                </p>
              )}
              {saveError && (
                <p className="text-sm font-medium text-status-red" role="alert">
                  {saveError}
                </p>
              )}

              <button type="submit" disabled={isSaving} className={primaryButtonClasses}>
                {isSaving ? "Saving..." : "Update Status"}
              </button>
            </form>
          </Card>

          <Card className="mt-6">
            <h2 className="font-bold text-slate-900">Status History</h2>
            <p className="mt-1 text-sm text-slate-500">Every status change recorded for this application, oldest first.</p>

            {isLoadingHistory && <p className="mt-4 text-sm text-slate-400">Loading...</p>}
            {historyError && (
              <p className="mt-4 text-sm font-medium text-status-red" role="alert">
                {historyError}
              </p>
            )}
            {!isLoadingHistory && !historyError && statusHistory.length === 0 && (
              <p className="mt-4 text-sm text-slate-400">No status changes recorded yet.</p>
            )}

            {!isLoadingHistory && !historyError && statusHistory.length > 0 && (
              <ul className="mt-4 space-y-3">
                {statusHistory.map((entry) => (
                  <li key={entry.historyId} className="border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-800">
                        {entry.fromStatus ? `${entry.fromStatus} → ${entry.toStatus}` : `${entry.toStatus} (submitted)`}
                      </span>
                      <span className="text-xs text-slate-400">{formatDateTime(entry.changedAt)}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500">
                      by {entry.changedByName ?? "the applicant"}
                      {entry.remarks && <> — {entry.remarks}</>}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="mt-6">
            <h2 className="font-bold text-slate-900">Records Archive</h2>
            {application.isArchived ? (
              <>
                <p className="mt-1 text-sm text-slate-500">
                  Archived {formatDateTime(application.archivedAt)}. The record and its documents remain retrievable
                  and are not deleted, supporting the school's 5-year retention practice.
                </p>
                {application.archiveReason && (
                  <p className="mt-2 text-sm text-slate-600">
                    <strong className="font-semibold text-slate-800">Reason:</strong> {application.archiveReason}
                  </p>
                )}
              </>
            ) : canArchive ? (
              <>
                <p className="mt-1 text-sm text-slate-500">
                  Archive this completed application to support the school's document disposal process. Archiving
                  never deletes the record — it stays retrievable for the 5-year retention practice.
                </p>

                <form onSubmit={handleArchiveSubmit} noValidate className="mt-4 space-y-4">
                  <div>
                    <label className={labelClasses} htmlFor="archiveReason">
                      Reason (optional)
                    </label>
                    <textarea
                      id="archiveReason"
                      name="archiveReason"
                      rows={2}
                      maxLength={500}
                      className={inputClasses}
                      value={archiveReason}
                      onChange={(event) => setArchiveReason(event.target.value)}
                    />
                  </div>

                  {archiveError && (
                    <p className="text-sm font-medium text-status-red" role="alert">
                      {archiveError}
                    </p>
                  )}

                  <button type="submit" disabled={isArchiving} className={primaryButtonClasses}>
                    {isArchiving ? "Archiving..." : "Archive Application"}
                  </button>
                </form>
              </>
            ) : (
              <p className="mt-1 text-sm text-slate-500">
                Only completed applications (Approved or Rejected) can be archived.
              </p>
            )}
          </Card>
        </>
      )}
    </AppShell>
  );
}
