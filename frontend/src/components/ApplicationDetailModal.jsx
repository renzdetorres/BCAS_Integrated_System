import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getApplicationStatusHistory } from "../api/adminApplicationsApi.js";
import { ApiError } from "../api/apiClient.js";
import Modal, { DetailList } from "./ui/Modal.jsx";
import StatusBadge from "./ui/StatusBadge.jsx";
import WorkflowStepper, { ADMISSION_STEP_LABELS, SCHOLARSHIP_STEP_LABELS } from "./WorkflowStepper.jsx";
import "./ApplicationDetailModal.css";

const APPLICATION_TYPE_LABELS = { NewStudent: "New Student", Transferee: "Transferee" };

function formatDateTime(isoDateTime) {
  return new Date(isoDateTime).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * The complete application, read in place over the Applications list.
 * Status changes, department changes and archiving stay on the full record
 * page (one "Manage application" click away) - this is for reading.
 */
export default function ApplicationDetailModal({ application, onClose }) {
  const [history, setHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState(null);

  useEffect(() => {
    if (!application) return undefined;
    let cancelled = false;
    setIsLoadingHistory(true);
    setHistoryError(null);

    getApplicationStatusHistory(application.applicationId, application.category)
      .then((data) => {
        if (!cancelled) setHistory(data);
      })
      .catch((error) => {
        if (!cancelled) setHistoryError(error instanceof ApiError ? error.message : "Failed to load status history.");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingHistory(false);
      });

    return () => {
      cancelled = true;
    };
  }, [application]);

  if (!application) return null;

  const isAdmission = application.category === "Admission";
  const details = isAdmission
    ? [
        { label: "Application type", value: APPLICATION_TYPE_LABELS[application.applicationType] ?? application.applicationType },
        { label: "Course applied for", value: application.courseAppliedFor },
        { label: "Previous school", value: application.previousSchool },
      ]
    : [
        { label: "Scholarship", value: application.scholarshipName },
        { label: "Scholarship type", value: application.scholarshipType },
        { label: "Grade average", value: application.gradeAverage },
      ];

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={application.applicantName}
      subtitle={`${application.applicantEmail} · ${application.category} application`}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <Link to={`/admin/applications/${application.applicationId}`} className="btn btn-primary">
            Manage application
          </Link>
        </>
      }
    >
      <div className="ui-modal-section">
        <div className="app-modal-status">
          <StatusBadge status={application.status} adminContext />
          {application.isArchived ? <StatusBadge status="Inactive" label="Archived" /> : null}
        </div>
        <DetailList
          items={[
            ...details,
            {
              label: "Department",
              value: application.department ?? <span className="app-modal-unassigned">Unassigned</span>,
            },
            { label: "Submitted", value: formatDateTime(application.submittedAt) },
            { label: "Last updated", value: formatDateTime(application.updatedAt) },
            application.remarks ? { label: "Remarks", value: application.remarks, wide: true } : null,
            application.isArchived
              ? { label: "Archive reason", value: application.archiveReason ?? null, wide: true }
              : null,
          ]}
        />
      </div>

      <div className="ui-modal-section">
        <h3 className="ui-modal-section-title">Workflow</h3>
        <WorkflowStepper steps={application.steps} labels={isAdmission ? ADMISSION_STEP_LABELS : SCHOLARSHIP_STEP_LABELS} />
      </div>

      <div className="ui-modal-section">
        <h3 className="ui-modal-section-title">Status history</h3>
        {isLoadingHistory ? (
          <p className="app-modal-muted">Loading history...</p>
        ) : historyError ? (
          <p className="form-error" role="alert">
            {historyError}
          </p>
        ) : history.length === 0 ? (
          <p className="app-modal-muted">No status changes recorded yet.</p>
        ) : (
          <ol className="app-modal-history">
            {history.map((entry) => (
              <li key={entry.historyId}>
                <span className="app-modal-history-dot" aria-hidden="true" />
                <div>
                  <p className="app-modal-history-line">
                    {entry.fromStatus ? (
                      <>
                        {entry.fromStatus} <span aria-hidden="true">&rarr;</span>
                        <span className="visually-hidden"> to </span> <strong>{entry.toStatus}</strong>
                      </>
                    ) : (
                      <strong>Application submitted</strong>
                    )}
                  </p>
                  <p className="app-modal-history-meta">
                    {formatDateTime(entry.changedAt)} &middot; by {entry.changedByName ?? "the applicant"}
                    {entry.remarks ? `. ${entry.remarks}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Modal>
  );
}
