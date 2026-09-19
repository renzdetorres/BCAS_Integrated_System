import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AppShell from "../components/layout/AppShell.jsx";
import Card from "../components/ui/Card.jsx";
import Stepper from "../components/ui/Stepper.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import {
  FINAL_DECISIONS,
  getScholarshipApplicationDetail,
  recordFinalDecision,
} from "../api/academicHeadScholarshipApplicationsApi.js";
import { ApiError } from "../api/apiClient.js";
import { inputClasses, primaryButtonClasses } from "../lib/formStyles.js";

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

  const steps = application
    ? application.workflowStages.map((stage) => {
        const currentIndex = application.workflowStages.indexOf(application.status);
        const stageIndex = application.workflowStages.indexOf(stage);
        const state = stage === application.status ? "current" : stageIndex < currentIndex ? "done" : "upcoming";
        return { name: stageLabel(stage), state };
      })
    : [];

  return (
    <AppShell>
      <Link to="/portal" className="inline-flex items-center gap-1 text-sm font-semibold text-forest hover:underline">
        <ArrowLeft size={16} /> Back to dashboard
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold text-slate-900">Scholarship Records Review</h1>

      {isLoading && <p className="mt-6 text-sm text-slate-400">Loading...</p>}
      {loadError && (
        <p className="mt-6 text-sm font-medium text-status-red" role="alert">
          {loadError}
        </p>
      )}

      {!isLoading && !loadError && application && (
        <>
          <Card className="mt-6">
            <h2 className="font-bold text-slate-900">Workflow</h2>
            <div className="mt-4">
              <Stepper steps={steps} />
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Current status: <span className="font-semibold text-slate-800">{application.status}</span>
              {!application.canConfirmDecision && !application.finalDecision && (
                <> — not yet ready for a final decision (must reach "Result" first).</>
              )}
            </p>
          </Card>

          <Card className="mt-6">
            <h2 className="font-bold text-slate-900">Applicant &amp; Academic Records</h2>
            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</dt>
                <dd className="mt-1 text-sm text-slate-800">{application.applicantName}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</dt>
                <dd className="mt-1 text-sm text-slate-800">{application.applicantEmail}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">BCASian</dt>
                <dd className="mt-1 text-sm text-slate-800">
                  {application.isBcasian === null ? "Unknown" : application.isBcasian ? "Yes" : "No"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scholarship</dt>
                <dd className="mt-1 text-sm text-slate-800">
                  {application.scholarshipName} ({application.scholarshipType})
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Grade Average</dt>
                <dd className="mt-1 text-sm text-slate-800">
                  {application.gradeAverage}{" "}
                  {application.minimumGradeAverage !== null && `(min. ${application.minimumGradeAverage})`}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Submitted</dt>
                <dd className="mt-1 text-sm text-slate-800">{formatDateTime(application.submittedAt)}</dd>
              </div>
            </dl>
          </Card>

          <Card className="mt-6">
            <h2 className="font-bold text-slate-900">Submitted Documents</h2>
            {application.documents.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">No documents uploaded yet.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {application.documents.map((document) => (
                  <li
                    key={document.documentType}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
                  >
                    <span className="text-sm text-slate-700">{document.documentType}</span>
                    <StatusBadge status={document.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="mt-6">
            <h2 className="font-bold text-slate-900">Evaluation Result</h2>
            {application.screening ? (
              <p className="mt-2 text-sm">
                <StatusBadge status={application.screening.verdict === "Qualified" ? "Qualified" : "Not Qualified"} />{" "}
                <span className="text-slate-500">
                  by {application.screening.evaluatedByName} on {formatDateTime(application.screening.evaluatedAt)}
                </span>
                {application.screening.remarks && (
                  <span className="block mt-1 italic text-slate-500">"{application.screening.remarks}"</span>
                )}
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-400">Not yet screened by an Evaluator.</p>
            )}
          </Card>

          {application.finalDecision && (
            <Card className="mt-6">
              <h2 className="font-bold text-slate-900">Confirmed Decision</h2>
              <p className="mt-2 text-sm">
                <StatusBadge status={application.finalDecision.decision} />{" "}
                <span className="text-slate-500">
                  by {application.finalDecision.decidedByName} on {formatDateTime(application.finalDecision.decidedAt)}
                </span>
                {application.finalDecision.remarks && (
                  <span className="block mt-1 italic text-slate-500">"{application.finalDecision.remarks}"</span>
                )}
              </p>
            </Card>
          )}

          {application.canConfirmDecision && (
            <Card className="mt-6">
              <h2 className="font-bold text-slate-900">Confirm Final Decision</h2>
              <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
                <div className="flex gap-4">
                  {FINAL_DECISIONS.map((option) => (
                    <label key={option.value} className="flex items-center gap-2 text-sm font-medium text-slate-700">
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

                <textarea
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="Remarks (optional)"
                  className={inputClasses}
                />

                {saveError && (
                  <p className="text-sm font-medium text-status-red" role="alert">
                    {saveError}
                  </p>
                )}
                {savedMessage && (
                  <p className="text-sm font-medium text-status-green" role="status">
                    {savedMessage}
                  </p>
                )}

                <button type="submit" disabled={isSaving} className={primaryButtonClasses}>
                  {isSaving ? "Confirming..." : "Confirm Decision"}
                </button>
              </form>
            </Card>
          )}
        </>
      )}
    </AppShell>
  );
}
