import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  FINAL_DECISIONS,
  getScholarshipApplicationDetail,
  recordFinalDecision,
} from "../api/academicHeadScholarshipApplicationsApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import WorkflowStepper, { SCHOLARSHIP_STEP_LABELS } from "../components/WorkflowStepper.jsx";
import "./AcademicHeadReviewPage.css";

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
    <AppLayout title="Scholarship Records Review">
        {isLoading && <p>Loading...</p>}
        {loadError && (
          <p className="form-error" role="alert">
            {loadError}
          </p>
        )}

        {!isLoading && !loadError && application && (
          <>
            <Card className="ah-review-section">
              <h2>Workflow</h2>
              <WorkflowStepper
                steps={application.workflowStages.map((stage, index) => {
                  const currentIndex = application.workflowStages.indexOf(application.status);
                  return {
                    step: stage,
                    isCurrent: stage === application.status,
                    isComplete: currentIndex >= 0 && index < currentIndex,
                  };
                })}
                labels={SCHOLARSHIP_STEP_LABELS}
              />
              <p className="ah-status-line">
                Current status: <strong>{application.status}</strong>
                {!application.canConfirmDecision && !application.finalDecision && (
                  <> - not yet ready for a final decision (must reach "Result" first).</>
                )}
              </p>
            </Card>

            {/* One case file, not four identical stacked cards: the Academic
                Head reads the applicant's record, documents and the
                Evaluator's verdict before deciding anything, so it reads as
                consecutive pages of one dossier - matching the pattern
                already used on the Evaluator's own screening page for the
                same record, one workflow step earlier. */}
            <Card className="ah-dossier">
              <div className="ah-dossier-section">
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
              </div>

              <div className="ah-dossier-section">
                <h2>Submitted Documents</h2>
                {application.documents.length === 0 ? (
                  <p>No documents uploaded yet.</p>
                ) : (
                  <ul className="ah-document-list">
                    {application.documents.map((document) => (
                      <li key={document.documentType} className="ah-document-row">
                        <span>{document.documentType}</span>
                        <StatusBadge status={document.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="ah-dossier-section">
                <h2>Evaluation Result</h2>
                {application.screening ? (
                  <p className="ah-eval-result">
                    <StatusBadge status={application.screening.verdict} /> by{" "}
                    {application.screening.evaluatedByName} on {formatDateTime(application.screening.evaluatedAt)}
                    {application.screening.remarks && <> &mdash; "{application.screening.remarks}"</>}
                  </p>
                ) : (
                  <p>Not yet screened by an Evaluator.</p>
                )}
              </div>

              {application.finalDecision && (
                <div className="ah-dossier-section">
                  <h2>Confirmed Decision</h2>
                  <p className="ah-eval-result">
                    <StatusBadge status={application.finalDecision.decision} /> by{" "}
                    {application.finalDecision.decidedByName} on {formatDateTime(application.finalDecision.decidedAt)}
                    {application.finalDecision.remarks && <> &mdash; "{application.finalDecision.remarks}"</>}
                  </p>
                </div>
              )}
            </Card>

            {application.canConfirmDecision && (
              <Card className="ah-review-section">
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
              </Card>
            )}
          </>
        )}
    </AppLayout>
  );
}
