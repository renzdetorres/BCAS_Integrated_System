import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  SCREENING_VERDICTS,
  advanceScholarshipApplicationWorkflow,
  getScholarshipApplicationDetail,
  recordScholarshipScreening,
} from "../api/evaluatorScholarshipApplicationsApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import "./ScholarshipScreeningPage.css";

const STAGE_LABELS = {
  Submitted: "Submitted",
  DocumentsVerified: "Documents Verified",
  EligibilityScreening: "Eligibility Screening",
  Evaluation: "Evaluation",
  Result: "Result",
};

function stageLabel(stage) {
  return STAGE_LABELS[stage] ?? stage;
}

function formatDateTime(isoDateTime) {
  return new Date(isoDateTime).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ScholarshipScreeningPage() {
  const { applicationId } = useParams();
  const [application, setApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [verdict, setVerdict] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saveError, setSaveError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(null);
  const [advanceError, setAdvanceError] = useState(null);
  const [isAdvancing, setIsAdvancing] = useState(false);

  const loadApplication = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getScholarshipApplicationDetail(applicationId);
      setApplication(data);
      setVerdict(data.screening?.verdict ?? "");
      setRemarks(data.screening?.remarks ?? "");
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : "Failed to load application.");
    } finally {
      setIsLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    loadApplication();
  }, [loadApplication]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!verdict) {
      setSaveError("Select a verdict before saving.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSavedMessage(null);
    try {
      const updated = await recordScholarshipScreening(applicationId, { verdict, remarks });
      setApplication(updated);
      setSavedMessage("Screening verdict saved.");
    } catch (error) {
      setSaveError(error instanceof ApiError ? error.message : "Failed to save the screening verdict.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAdvance() {
    setIsAdvancing(true);
    setAdvanceError(null);
    try {
      const updated = await advanceScholarshipApplicationWorkflow(applicationId);
      setApplication(updated);
    } catch (error) {
      setAdvanceError(error instanceof ApiError ? error.message : "Failed to advance the application.");
    } finally {
      setIsAdvancing(false);
    }
  }

  return (
    <AppLayout title="Scholarship Screening">
        {isLoading && <p>Loading...</p>}
        {loadError && (
          <p className="form-error" role="alert">
            {loadError}
          </p>
        )}

        {!isLoading && !loadError && application && (
          <>
            <Card className="screening-section">
              <h2>Workflow</h2>
              <ol className="workflow-stepper">
                {application.workflowStages.map((stage) => {
                  const currentIndex = application.workflowStages.indexOf(application.status);
                  const stageIndex = application.workflowStages.indexOf(stage);
                  const isCurrent = stage === application.status;
                  const isDone = currentIndex >= 0 && stageIndex < currentIndex;
                  return (
                    <li
                      key={stage}
                      className={
                        isCurrent ? "workflow-step workflow-step-current" : isDone ? "workflow-step workflow-step-done" : "workflow-step"
                      }
                    >
                      {stageLabel(stage)}
                    </li>
                  );
                })}
              </ol>
              {!application.workflowStages.includes(application.status) && (
                <p className="workflow-final-note">
                  Status is <strong>{application.status}</strong> - a final decision outside this workflow.
                </p>
              )}

              {advanceError && (
                <p className="form-error" role="alert">
                  {advanceError}
                </p>
              )}

              {application.canAdvance && (
                <button type="button" className="workflow-advance-button" onClick={handleAdvance} disabled={isAdvancing}>
                  {isAdvancing ? "Advancing..." : "Advance to Next Stage"}
                </button>
              )}
            </Card>

            <Card className="screening-section">
              <h2>Applicant</h2>
              <dl className="screening-detail-list">
                <div>
                  <dt>Name</dt>
                  <dd>{application.applicantName}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{application.applicantEmail}</dd>
                </div>
                <div>
                  <dt>BCASian</dt>
                  <dd>{application.isBcasian === null ? "Unknown" : application.isBcasian ? "Yes" : "No"}</dd>
                </div>
              </dl>
            </Card>

            <Card className="screening-section">
              <h2>Scholarship Requirements Check</h2>
              <dl className="screening-detail-list">
                <div>
                  <dt>Scholarship</dt>
                  <dd>
                    {application.scholarshipName} ({application.scholarshipType})
                  </dd>
                </div>
                <div>
                  <dt>Applicant Grade Average</dt>
                  <dd>{application.gradeAverage}</dd>
                </div>
                <div>
                  <dt>Minimum Grade Required</dt>
                  <dd>{application.minimumGradeAverage ?? "Not set"}</dd>
                </div>
                <div>
                  <dt>Meets Requirement</dt>
                  <dd>
                    {application.meetsMinimumGrade === null ? (
                      "N/A"
                    ) : (
                      <StatusBadge
                        status={application.meetsMinimumGrade ? "Eligible" : "NotEligible"}
                        label={application.meetsMinimumGrade ? "Yes" : "No"}
                      />
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Application Status</dt>
                  <dd>{application.status}</dd>
                </div>
                <div>
                  <dt>Submitted</dt>
                  <dd>{formatDateTime(application.submittedAt)}</dd>
                </div>
              </dl>
            </Card>

            <Card className="screening-section">
              <h2>Eligibility Rules</h2>
              <ul className="rules-list">
                <li className="rules-item">
                  <span className="rules-item-label">Top 1 (free all, no entrance exam, no interview)</span>
                  <span className={application.eligibilityRules.isTopOne ? "rules-badge-yes" : "rules-badge-no"}>
                    {application.eligibilityRules.isTopOne ? "Yes" : "No"}
                  </span>
                </li>
                <li className="rules-item">
                  <span className="rules-item-label">Entrance Exam Required (Non-BCASian)</span>
                  <span
                    className={
                      application.eligibilityRules.entranceExamRequired === null
                        ? "rules-badge-unknown"
                        : application.eligibilityRules.entranceExamRequired
                          ? "rules-badge-yes"
                          : "rules-badge-no"
                    }
                  >
                    {application.eligibilityRules.entranceExamRequired === null
                      ? "Unknown"
                      : application.eligibilityRules.entranceExamRequired
                        ? "Required"
                        : "Not Required"}
                  </span>
                </li>
                {application.eligibilityRules.entranceExamRequired && (
                  <li className="rules-item">
                    <span className="rules-item-label">Entrance Exam Scheduled</span>
                    <span
                      className={
                        application.eligibilityRules.entranceExamScheduled ? "rules-badge-yes" : "rules-badge-no"
                      }
                    >
                      {application.eligibilityRules.entranceExamScheduled ? "Yes" : "Not Yet"}
                    </span>
                  </li>
                )}
                <li className="rules-item">
                  <span className="rules-item-label">Scholarship Slots</span>
                  <span className="rules-item-value">
                    {application.eligibilityRules.remainingSlots} remaining of{" "}
                    {application.eligibilityRules.totalSlots}
                  </span>
                </li>
                <li className="rules-item">
                  <span className="rules-item-label">Reapplication</span>
                  <span className={application.eligibilityRules.isReapplication ? "rules-badge-yes" : "rules-badge-no"}>
                    {application.eligibilityRules.isReapplication ? "Yes" : "No"}
                  </span>
                </li>
              </ul>

              {application.eligibilityRules.previousAttempts.length > 0 && (
                <div className="reapplication-history">
                  <h3>Previous Attempts for This Scholarship</h3>
                  <ul className="reapplication-list">
                    {application.eligibilityRules.previousAttempts.map((attempt) => (
                      <li key={attempt.applicationId} className="reapplication-row">
                        <StatusBadge status={attempt.status} />
                        {attempt.screeningVerdict ? (
                          <StatusBadge status={attempt.screeningVerdict} />
                        ) : (
                          <StatusBadge status="Pending" label="Not screened" />
                        )}
                        <span className="reapplication-date">{formatDateTime(attempt.submittedAt)}</span>
                        {attempt.screeningRemarks && (
                          <span className="reapplication-remarks">"{attempt.screeningRemarks}"</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>

            <Card className="screening-section">
              <h2>Submitted Documents</h2>
              {application.documents.length === 0 ? (
                <p>No documents uploaded yet.</p>
              ) : (
                <ul className="document-list">
                  {application.documents.map((document) => (
                    <li key={document.documentType} className="document-row">
                      <div>
                        <span className="document-type">{document.documentType}</span>
                        <span className="document-filename">{document.fileName}</span>
                      </div>
                      <div className="document-status-group">
                        <StatusBadge status={document.status} />
                        {document.flaggedReason && (
                          <span className="document-flagged-reason">{document.flaggedReason}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {application.screening && (
              <Card className="screening-section">
                <h2>Current Verdict</h2>
                <p className="screening-current-verdict">
                  <StatusBadge status={application.screening.verdict} /> by{" "}
                  {application.screening.evaluatedByName} on{" "}
                  {formatDateTime(application.screening.evaluatedAt)}
                </p>
                {application.screening.remarks && (
                  <p className="screening-current-remarks">"{application.screening.remarks}"</p>
                )}
              </Card>
            )}

            <Card className="screening-section">
              <h2>Record Verdict</h2>
              <form onSubmit={handleSubmit} noValidate>
                <div className="form-row">
                  <span className="form-row-label">Verdict</span>
                  <div className="verdict-options">
                    {SCREENING_VERDICTS.map((option) => (
                      <label key={option.value} className="verdict-option">
                        <input
                          type="radio"
                          name="verdict"
                          value={option.value}
                          checked={verdict === option.value}
                          onChange={(event) => setVerdict(event.target.value)}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-row">
                  <label htmlFor="remarks">Remarks (optional)</label>
                  <textarea
                    id="remarks"
                    value={remarks}
                    onChange={(event) => setRemarks(event.target.value)}
                    rows={4}
                    maxLength={1000}
                  />
                </div>

                {saveError && (
                  <p className="form-error" role="alert">
                    {saveError}
                  </p>
                )}
                {savedMessage && (
                  <p className="form-success" role="status">
                    {savedMessage}
                  </p>
                )}

                <button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Verdict"}
                </button>
              </form>
            </Card>
          </>
        )}
    </AppLayout>
  );
}
