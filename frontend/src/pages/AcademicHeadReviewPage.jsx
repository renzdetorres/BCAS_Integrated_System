import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  FINAL_DECISIONS,
  getScholarshipApplicationDetail,
  recordFinalDecision,
} from "../api/academicHeadScholarshipApplicationsApi.js";
import { ApiError } from "../api/apiClient.js";
import "./AcademicHeadReviewPage.css";

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

export default function AcademicHeadReviewPage() {
  const { applicationId } = useParams();
  const [application, setApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [decision, setDecision] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saveError, setSaveError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(null);

  const loadApplication = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getScholarshipApplicationDetail(applicationId);
      setApplication(data);
      setDecision(data.finalDecision?.decision ?? "");
      setRemarks(data.finalDecision?.remarks ?? "");
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
    if (!decision) {
      setSaveError("Select a decision before confirming.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSavedMessage(null);
    try {
      const updated = await recordFinalDecision(applicationId, { decision, remarks });
      setApplication(updated);
      setSavedMessage("Final decision confirmed.");
    } catch (error) {
      setSaveError(error instanceof ApiError ? error.message : "Failed to confirm the decision.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="ah-review-page">
      <div className="ah-review-card">
        <Link className="ah-review-back-link" to="/portal">
          &larr; Back to dashboard
        </Link>
        <h1>Scholarship Records Review</h1>

        {isLoading && <p>Loading...</p>}
        {loadError && (
          <p className="form-error" role="alert">
            {loadError}
          </p>
        )}

        {!isLoading && !loadError && application && (
          <>
            <section className="ah-review-section">
              <h2>Workflow</h2>
              <ol className="ah-workflow-stepper">
                {application.workflowStages.map((stage) => {
                  const currentIndex = application.workflowStages.indexOf(application.status);
                  const stageIndex = application.workflowStages.indexOf(stage);
                  const isCurrent = stage === application.status;
                  const isDone = currentIndex >= 0 && stageIndex < currentIndex;
                  return (
                    <li
                      key={stage}
                      className={
                        isCurrent
                          ? "ah-workflow-step ah-workflow-step-current"
                          : isDone
                            ? "ah-workflow-step ah-workflow-step-done"
                            : "ah-workflow-step"
                      }
                    >
                      {stageLabel(stage)}
                    </li>
                  );
                })}
              </ol>
              <p className="ah-status-line">
                Current status: <strong>{application.status}</strong>
                {!application.canConfirmDecision && !application.finalDecision && (
                  <> - not yet ready for a final decision (must reach "Result" first).</>
                )}
              </p>
            </section>

            <section className="ah-review-section">
              <h2>Applicant &amp; Academic Records</h2>
              <dl className="ah-detail-list">
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
                <div>
                  <dt>Scholarship</dt>
                  <dd>
                    {application.scholarshipName} ({application.scholarshipType})
                  </dd>
                </div>
                <div>
                  <dt>Grade Average</dt>
                  <dd>
                    {application.gradeAverage}{" "}
                    {application.minimumGradeAverage !== null && `(min. ${application.minimumGradeAverage})`}
                  </dd>
                </div>
                <div>
                  <dt>Submitted</dt>
                  <dd>{formatDateTime(application.submittedAt)}</dd>
                </div>
              </dl>
            </section>

            <section className="ah-review-section">
              <h2>Submitted Documents</h2>
              {application.documents.length === 0 ? (
                <p>No documents uploaded yet.</p>
              ) : (
                <ul className="ah-document-list">
                  {application.documents.map((document) => (
                    <li key={document.documentType} className="ah-document-row">
                      <span>{document.documentType}</span>
                      <span className={`ah-document-status ah-document-status-${document.status.toLowerCase()}`}>
                        {document.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="ah-review-section">
              <h2>Evaluation Result</h2>
              {application.screening ? (
                <p className="ah-eval-result">
                  <span
                    className={
                      application.screening.verdict === "Qualified" ? "ah-verdict-qualified" : "ah-verdict-not-qualified"
                    }
                  >
                    {application.screening.verdict === "Qualified" ? "Qualified" : "Not Qualified"}
                  </span>{" "}
                  by {application.screening.evaluatedByName} on {formatDateTime(application.screening.evaluatedAt)}
                  {application.screening.remarks && <> &mdash; "{application.screening.remarks}"</>}
                </p>
              ) : (
                <p>Not yet screened by an Evaluator.</p>
              )}
            </section>

            {application.finalDecision && (
              <section className="ah-review-section">
                <h2>Confirmed Decision</h2>
                <p className="ah-eval-result">
                  <span
                    className={
                      application.finalDecision.decision === "Approved" ? "ah-decision-approved" : "ah-decision-rejected"
                    }
                  >
                    {application.finalDecision.decision}
                  </span>{" "}
                  by {application.finalDecision.decidedByName} on {formatDateTime(application.finalDecision.decidedAt)}
                  {application.finalDecision.remarks && <> &mdash; "{application.finalDecision.remarks}"</>}
                </p>
              </section>
            )}

            {application.canConfirmDecision && (
              <section className="ah-review-section">
                <h2>Confirm Final Decision</h2>
                <form onSubmit={handleSubmit} noValidate>
                  <div className="form-row">
                    <span className="form-row-label">Decision</span>
                    <div className="ah-decision-options">
                      {FINAL_DECISIONS.map((option) => (
                        <label key={option.value} className="ah-decision-option">
                          <input
                            type="radio"
                            name="decision"
                            value={option.value}
                            checked={decision === option.value}
                            onChange={(event) => setDecision(event.target.value)}
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
                    {isSaving ? "Confirming..." : "Confirm Decision"}
                  </button>
                </form>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
