import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMyScholarshipApplications } from "../api/scholarshipApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Icon from "../components/ui/Icon.jsx";
import BcasSeal from "../components/ui/BcasSeal.jsx";
import Skeleton from "../components/ui/Skeleton.jsx";
import {
  CONSENT_AND_AGREEMENT,
  CONSENT_QUESTIONS,
  CONSENT_RATIONALE,
  CONSENT_READ_NOTE,
  DATA_PRIVACY_CONSENT,
  DATA_PRIVACY_NOTICE,
  DEPARTMENT_FOR_LEVEL,
  SCHOOL_NAME,
} from "../config/scholarshipForm.js";
import "./ScholarshipFormPrintPage.css";

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

/** A line of the form: the answer when there is one, otherwise a blank to write on. */
function Field({ label, value }) {
  return (
    <div className="sform-field">
      <dt>{label}</dt>
      <dd className={value ? undefined : "sform-blank"}>{value || ""}</dd>
    </div>
  );
}

function Answer({ value }) {
  return (
    <span className="sform-answer">
      <span className="sform-box" aria-hidden="true">
        {value === true ? "✓" : ""}
      </span>
      Yes
      <span className="sform-box" aria-hidden="true">
        {value === false ? "✓" : ""}
      </span>
      No
    </span>
  );
}

/**
 * The scholarship application and consent form, filled in with the applicant's own answers, laid out to print on A4
 * (or save as a PDF). The applicant and their parent or guardian sign it, then upload the scan as the "Signed
 * Scholarship Application Form" document.
 */
export default function ScholarshipFormPrintPage() {
  const { applicationId } = useParams();
  const [application, setApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getMyScholarshipApplications()
      .then((applications) => {
        if (cancelled) return;
        const found = applications.find((a) => a.applicationId === applicationId);
        if (found) setApplication(found);
        else setErrorMessage("We couldn't find that scholarship application.");
      })
      .catch((error) => {
        if (!cancelled) setErrorMessage(error instanceof ApiError ? error.message : "Failed to load your scholarship application.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  const form = application?.form ?? {};
  const level = form.levelApplied ?? application?.levelApplied;

  return (
    <AppLayout>
      <div className="sform-toolbar no-print">
        <Link to="/scholarships" className="sform-back">
          <Icon name="arrow-left" size={16} />
          Back to my scholarship application
        </Link>
        {application ? (
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>
            <Icon name="printer" size={16} />
            Print / Save as PDF
          </button>
        ) : null}
      </div>

      {application ? (
        <p className="sform-steps no-print" role="note">
          <strong>How it works:</strong> print this form, have the applicant and the parent or official guardian sign it, then
          upload a clear scan or photo under <Link to="/application-tracking">My Application</Link> as the{" "}
          <em>Signed Scholarship Application Form</em> (PDF, JPG or PNG, up to 10 MB).
        </p>
      ) : null}

      {isLoading && <Skeleton className="no-print" />}
      {errorMessage && (
        <p className="form-error no-print" role="alert">
          {errorMessage}
        </p>
      )}

      {application && (
        <article className="sform-paper" aria-label="Scholarship application and consent form">
          <header className="sform-head">
            <BcasSeal size={56} />
            <div>
              <p className="sform-school">{SCHOOL_NAME}</p>
              <h1 className="sform-title">Academic Scholarship Application and Consent Form</h1>
              <p className="sform-year">School Year 2026-2027</p>
            </div>
          </header>

          <section className="sform-section">
            <h2>Scholarship applicant</h2>
            <dl className="sform-fields">
              <Field label="Full name (last name, first name, middle name)" value={form.applicantFullName} />
              <Field label="Level applied" value={level ? `${level} (${DEPARTMENT_FOR_LEVEL[level] ?? "-"})` : ""} />
              <Field label="School last attended" value={form.schoolLastAttended} />
              <Field label="Scholarship applied for" value={`${application.scholarshipName} (${application.scholarshipType})`} />
              <Field label="General average" value={String(application.gradeAverage)} />
              <Field label="Date submitted" value={formatDate(application.submittedAt)} />
            </dl>
          </section>

          <section className="sform-section">
            <h2>Parent or official guardian</h2>
            <dl className="sform-fields">
              <Field label="Relationship to the applicant" value={form.guardianRole} />
              <Field label="Full name" value={form.guardianName} />
              <Field label="Contact number" value={form.guardianContact} />
              <Field label="Email address" value={form.guardianEmail} />
            </dl>
          </section>

          <section className="sform-section">
            <h2>Data privacy and consent</h2>
            <p className="sform-note">{CONSENT_READ_NOTE}</p>
            {DATA_PRIVACY_CONSENT.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <ul className="sform-list">
              {CONSENT_RATIONALE.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p>{DATA_PRIVACY_NOTICE}</p>
            <h3>Consent and agreement</h3>
            <ol className="sform-list">
              {CONSENT_AND_AGREEMENT.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </section>

          <section className="sform-section sform-keep">
            <h2>Applicant&apos;s answers</h2>
            <ol className="sform-questions">
              {CONSENT_QUESTIONS.map((question) => (
                <li key={question.name}>
                  <p>{question.label}</p>
                  <Answer value={form[question.name]} />
                </li>
              ))}
            </ol>
          </section>

          <section className="sform-section sform-keep sform-signatures">
            <h2>Signatures</h2>
            <div className="sform-sign-grid">
              <div>
                <span className="sform-line" />
                <p className="sform-sign-label sform-sign-label-main">Signature over printed name of the scholarship applicant</p>
                <p className="sform-sign-name">{form.applicantFullName || ""}</p>
                <span className="sform-line sform-line-short" />
                <p className="sform-sign-label">Date signed</p>
              </div>
              <div>
                <span className="sform-line" />
                <p className="sform-sign-label sform-sign-label-main">Signature over printed name of the parent / official guardian</p>
                <p className="sform-sign-name">{form.guardianName || ""}</p>
                <span className="sform-line sform-line-short" />
                <p className="sform-sign-label">Date signed</p>
              </div>
            </div>
          </section>

          <footer className="sform-foot">
            <span>Application ref. {application.applicationId}</span>
            <span>Printed from the BCAS Scholarship &amp; Admissions portal</span>
          </footer>
        </article>
      )}
    </AppLayout>
  );
}
