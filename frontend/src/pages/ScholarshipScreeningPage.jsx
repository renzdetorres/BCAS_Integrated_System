import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, XCircle, Circle } from "lucide-react";
import AppShell from "../components/layout/AppShell.jsx";
import Card from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import {
  SCREENING_VERDICTS,
  advanceScholarshipApplicationWorkflow,
  getScholarshipApplicationDetail,
  recordScholarshipScreening,
} from "../api/evaluatorScholarshipApplicationsApi.js";
import { ApiError } from "../api/apiClient.js";
import { primaryButtonClasses } from "../lib/formStyles.js";

function formatDateTime(isoDateTime) {
  return new Date(isoDateTime).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Builds the checklist shown on screen from the real eligibility fields the API returns. */
function buildChecklist(application) {
  const items = [];

  items.push({
    label: `GWA of ${application.minimumGradeAverage ?? "—"} or higher`,
    detail: `Applicant: ${application.gradeAverage}`,
    met: application.meetsMinimumGrade,
    required: true,
  });

  items.push({
    label: "Scholarship slot available",
    detail: `${application.eligibilityRules.remainingSlots} remaining of ${application.eligibilityRules.totalSlots}`,
    met: application.eligibilityRules.remainingSlots > 0,
    required: true,
  });

  if (application.eligibilityRules.entranceExamRequired) {
    items.push({
      label: "Entrance exam scheduled (non-BCASian)",
      detail: application.eligibilityRules.entranceExamScheduled ? "Scheduled" : "Not yet scheduled",
      met: application.eligibilityRules.entranceExamScheduled,
      required: true,
    });
  }

  items.push({
    label: "Top 1 automatic qualifier",
    detail: application.eligibilityRules.isTopOne ? "Yes" : "No",
    met: application.eligibilityRules.isTopOne,
    required: false,
  });

  items.push({
    label: "First-time applicant for this scholarship",
    detail: application.eligibilityRules.isReapplication ? "Reapplication" : "First attempt",
    met: !application.eligibilityRules.isReapplication,
    required: false,
  });

  return items;
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

  const checklist = application ? buildChecklist(application) : [];
  const requiredUnmet = checklist.filter((c) => c.required && !c.met).length;
  const optionalMet = checklist.filter((c) => !c.required && c.met).length;
  const passes = requiredUnmet === 0;

  return (
    <AppShell>
      <h1 className="text-2xl font-extrabold text-slate-900">Eligibility Screening</h1>
      {application && (
        <p className="mt-1 text-sm text-slate-500">
          {application.applicationId.slice(0, 8).toUpperCase()} · {application.applicantName} ·{" "}
          {application.scholarshipName}
        </p>
      )}

      {isLoading && <p className="mt-6 text-sm text-slate-400">Loading...</p>}
      {loadError && (
        <p className="mt-6 text-sm font-medium text-status-red" role="alert">
          {loadError}
        </p>
      )}

      {!isLoading && !loadError && application && (
        <>
          <Card className="mt-6">
            <div className="flex items-center gap-4">
              <span
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${
                  passes ? "bg-status-greenBg text-status-green" : "bg-status-redBg text-status-red"
                }`}
              >
                {passes ? <CheckCircle2 size={30} /> : <XCircle size={30} />}
              </span>
              <div>
                <p className="text-lg font-bold text-slate-900">
                  {passes ? "Meets Required Criteria" : "Fails Required Criteria"}
                </p>
                <p className="text-sm text-slate-500">
                  {optionalMet} optional criterion met · {requiredUnmet} required unmet
                </p>
              </div>
            </div>
          </Card>

          <Card className="mt-6">
            <h2 className="font-bold text-slate-900">Eligibility Checklist</h2>
            <ul className="mt-4 space-y-3">
              {checklist.map((item) => (
                <li key={item.label} className="flex items-start gap-3">
                  {item.met ? (
                    <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-status-green" />
                  ) : (
                    <Circle size={20} className="mt-0.5 shrink-0 text-slate-300" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {item.label} <span className="font-normal text-slate-500">({item.detail})</span>
                    </p>
                    <p className="text-xs text-slate-400">{item.required ? "Required" : "Optional"}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {application.canAdvance && (
            <Card className="mt-6">
              <h2 className="font-bold text-slate-900">Workflow</h2>
              <p className="mt-1 text-sm text-slate-500">Current stage: {application.status}</p>
              {advanceError && (
                <p className="mt-2 text-sm font-medium text-status-red" role="alert">
                  {advanceError}
                </p>
              )}
              <button
                type="button"
                onClick={handleAdvance}
                disabled={isAdvancing}
                className={`${primaryButtonClasses} mt-3`}
              >
                {isAdvancing ? "Advancing..." : "Advance to Next Stage"}
              </button>
            </Card>
          )}

          {application.screening && (
            <Card className="mt-6">
              <h2 className="font-bold text-slate-900">Current Verdict</h2>
              <p className="mt-2 text-sm">
                <StatusBadge
                  status={application.screening.verdict === "Qualified" ? "Qualified" : "Not Qualified"}
                />{" "}
                <span className="text-slate-500">
                  by {application.screening.evaluatedByName} on {formatDateTime(application.screening.evaluatedAt)}
                </span>
              </p>
              {application.screening.remarks && (
                <p className="mt-2 text-sm italic text-slate-500">"{application.screening.remarks}"</p>
              )}
            </Card>
          )}

          <Card className="mt-6">
            <h2 className="font-bold text-slate-900">Record Verdict</h2>
            <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
              <div className="flex gap-4">
                {SCREENING_VERDICTS.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 text-sm font-medium text-slate-700">
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

              <textarea
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Remarks (optional)"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest"
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
                {isSaving ? "Saving..." : "Save Verdict"}
              </button>
            </form>
          </Card>
        </>
      )}
    </AppShell>
  );
}
