import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  SCREENING_VERDICTS,
  getScholarshipApplicationDetail,
  recordScholarshipScreening,
} from "../api/evaluatorScholarshipApplicationsApi.js";
import { ApiError } from "../api/apiClient.js";
import "./ScholarshipScreeningPage.css";

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

  return (
    <main className="screening-page">
      <div className="screening-card">
        <Link className="screening-back-link" to="/portal">
          &larr; Back to dashboard
        </Link>
        <h1>Scholarship Screening</h1>

        {isLoading && <p>Loading...</p>}
        {loadError && (
          <p className="form-error" role="alert">
            {loadError}
          </p>
        )}

        {!isLoading && !loadError && application && (
          <>
            <section className="screening-section">
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
            </section>

            <section className="screening-section">
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
                      <span
                        className={
                          application.meetsMinimumGrade ? "requirement-met" : "requirement-not-met"
                        }
                      >
                        {application.meetsMinimumGrade ? "Yes" : "No"}
                      </span>
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
            </section>

            {application.screening && (
              <section className="screening-section">
                <h2>Current Verdict</h2>
                <p className="screening-current-verdict">
                  <span
                    className={
                      application.screening.verdict === "Qualified"
                        ? "verdict-qualified"
                        : "verdict-not-qualified"
                    }
                  >
                    {application.screening.verdict === "Qualified" ? "Qualified" : "Not Qualified"}
                  </span>{" "}
                  by {application.screening.evaluatedByName} on{" "}
                  {formatDateTime(application.screening.evaluatedAt)}
                </p>
                {application.screening.remarks && (
                  <p className="screening-current-remarks">"{application.screening.remarks}"</p>
                )}
              </section>
            )}

            <section className="screening-section">
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
            </section>
          </>
        )}
      </div>
    </main>
  );
}
