import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getAvailableScholarships,
  getMyScholarshipApplications,
  submitScholarshipApplication,
} from "../api/scholarshipApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import ConfirmSubmissionModal from "../components/ConfirmSubmissionModal.jsx";
import {
  CONSENT_AND_AGREEMENT,
  CONSENT_QUESTIONS,
  CONSENT_READ_NOTE,
  CONSENT_RATIONALE,
  DATA_PRIVACY_CONSENT,
  DATA_PRIVACY_NOTICE,
  DEPARTMENT_FOR_LEVEL,
  DOCUMENTARY_REQUIREMENTS,
  GRADE_CERTIFICATION_NOTE,
  GRADE_REQUIREMENTS,
  GRANTS,
  GRANTS_NOTE,
  GUARDIAN_ROLE_OPTIONS,
  LEVEL_OPTIONS,
  SCHOOL_NAME,
  SCREENING_STEPS,
} from "../config/scholarshipForm.js";
import "./ScholarshipApplicationPage.css";

const initialForm = {
  scholarshipId: "",
  gradeAverage: "",
  levelApplied: "",
  applicantFullName: "",
  schoolLastAttended: "",
  guardianRole: "",
  guardianName: "",
  guardianContact: "",
  guardianEmail: "",
  consentTerms: "",
  consentParticipation: "",
  consentCertification: "",
};

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ScholarshipApplicationPage() {
  const navigate = useNavigate();
  const [scholarships, setScholarships] = useState([]);
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [errorMessage, setErrorMessage] = useState(null);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Settled independently: a failure loading past applications must not
    // hide the scholarship list (and with it the form).
    Promise.allSettled([getAvailableScholarships(), getMyScholarshipApplications()]).then(
      ([scholarshipResult, applicationResult]) => {
        if (cancelled) return;

        if (scholarshipResult.status === "fulfilled") {
          const scholarshipData = scholarshipResult.value;
          setScholarships(scholarshipData);
          if (scholarshipData.length > 0) {
            setForm((prev) => ({ ...prev, scholarshipId: String(scholarshipData[0].scholarshipId) }));
          }
        }
        if (applicationResult.status === "fulfilled") {
          setApplications(applicationResult.value);
        }

        const failure = [scholarshipResult, applicationResult].find((result) => result.status === "rejected");
        if (failure) {
          setErrorMessage(failure.reason instanceof ApiError ? failure.reason.message : "Failed to load scholarships.");
        }
        setIsLoading(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedScholarship = scholarships.find((s) => String(s.scholarshipId) === form.scholarshipId);

  const allConsented = CONSENT_QUESTIONS.every((q) => form[q.name] === "yes");
  const answeredNo = CONSENT_QUESTIONS.some((q) => form[q.name] === "no");
  const detailsComplete = Boolean(
    form.levelApplied &&
      form.applicantFullName.trim() &&
      form.schoolLastAttended.trim() &&
      form.guardianRole &&
      form.guardianName.trim() &&
      form.guardianContact.trim() &&
      form.guardianEmail.trim() &&
      form.gradeAverage !== "",
  );
  const requirements = GRADE_REQUIREMENTS[form.levelApplied];
  const grants = GRANTS[form.levelApplied];

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    setProfileIncomplete(false);
    setConfirming(true);
  }

  async function sendApplication() {
    setIsSubmitting(true);

    try {
      const created = await submitScholarshipApplication({
        ...form,
        scholarshipId: Number(form.scholarshipId),
        gradeAverage: Number(form.gradeAverage),
        consentTerms: form.consentTerms === "yes",
        consentParticipation: form.consentParticipation === "yes",
        consentCertification: form.consentCertification === "yes",
      });
      navigate(`/applications/receipt/${created.applicationId}`);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
        setProfileIncomplete(error.message.toLowerCase().includes("profile"));
      } else {
        setErrorMessage("Something went wrong. Please try again.");
      }
      setConfirming(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppLayout title="Scholarship Application">
      <Card className="scholarship-card">
        <h2>My Scholarship Applications</h2>
        {isLoading && <p>Loading...</p>}
        {!isLoading && applications.length === 0 && (
          <p>No applications submitted yet. Use the form below to apply.</p>
        )}
        {!isLoading && applications.length > 0 && (
          <ul className="scholarship-list">
            {applications.map((application) => (
              <li key={application.applicationId}>
                <div className="scholarship-list-header">
                  <span className="scholarship-name">{application.scholarshipName}</span>
                  <StatusBadge status={application.status} />
                </div>
                <p className="scholarship-meta">
                  {application.scholarshipType} &middot; {application.levelApplied ? `${application.levelApplied} · ` : ""}Grade average {application.gradeAverage} &middot;
                  Submitted {formatDate(application.submittedAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="scholarship-card">
        <h2>Submit Scholarship Application</h2>

        {errorMessage && (
          <p className="form-error" role="alert">
            {errorMessage}
            {profileIncomplete && (
              <>
                {" "}
                <Link to="/profile">Complete your profile</Link>.
              </>
            )}
          </p>
        )}

        {!isLoading && scholarships.length === 0 && applications.length === 0 && !errorMessage && (
          <p>No scholarship slots are currently open for applications.</p>
        )}

        {!isLoading && applications.length > 0 && (
          <p className="form-hint">
            You have already submitted your scholarship application. Only one scholarship application is allowed per
            applicant - track its progress under Application Tracking.
          </p>
        )}

        {(isLoading || scholarships.length > 0) && !(applications.length > 0) && (
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-row">
              <label htmlFor="scholarshipId">Scholarship</label>
              <select
                id="scholarshipId"
                name="scholarshipId"
                value={form.scholarshipId}
                onChange={handleChange}
                disabled={isLoading}
                required
              >
                {scholarships.map((s) => (
                  <option key={s.scholarshipId} value={s.scholarshipId}>
                    {s.name} ({s.scholarshipType}) -{" "}
                    {s.remainingSlots > 0
                      ? `${s.remainingSlots} slot${s.remainingSlots === 1 ? "" : "s"} left`
                      : "full, join waitlist"}
                  </option>
                ))}
              </select>
              {selectedScholarship && selectedScholarship.remainingSlots === 0 && (
                <p className="form-hint">
                  This scholarship is currently full. Applying will place you on its waitlist - if a slot opens up
                  later, your application moves automatically into the regular screening workflow.
                </p>
              )}
            </div>

            <h3 className="form-section-title">Scholarship applicant</h3>

            <div className="form-row">
              <label htmlFor="applicantFullName">Full name (last name, first name, middle name) of scholarship applicant</label>
              <input id="applicantFullName" name="applicantFullName" maxLength={200} required value={form.applicantFullName} onChange={handleChange} />
            </div>

            <div className="form-row">
              <label htmlFor="levelApplied">Level applied by the scholarship applicant</label>
              <select id="levelApplied" name="levelApplied" value={form.levelApplied} onChange={handleChange} required>
                <option value="">Select a level</option>
                {LEVEL_OPTIONS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
              {form.levelApplied && <p className="form-note">Department: {DEPARTMENT_FOR_LEVEL[form.levelApplied]}</p>}
            </div>

            <div className="form-row">
              <label htmlFor="schoolLastAttended">School last attended</label>
              <input id="schoolLastAttended" name="schoolLastAttended" maxLength={200} required value={form.schoolLastAttended} onChange={handleChange} />
            </div>

            <h3 className="form-section-title">Your parent / guardian</h3>
            <p className="form-note">Enter the details of your parent or official guardian, not your own.</p>

            <div className="form-row">
              <label htmlFor="guardianRole">Relationship to you</label>
              <select id="guardianRole" name="guardianRole" value={form.guardianRole} onChange={handleChange} required>
                <option value="">Select: parent or official guardian</option>
                {GUARDIAN_ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <label htmlFor="guardianName">Full name of your parent/guardian (last name, first name, middle name)</label>
              <input id="guardianName" name="guardianName" maxLength={200} required value={form.guardianName} onChange={handleChange} />
            </div>

            <div className="form-row">
              <label htmlFor="guardianContact">Contact number of your parent/guardian</label>
              <input id="guardianContact" name="guardianContact" type="tel" maxLength={50} required value={form.guardianContact} onChange={handleChange} />
            </div>

            <div className="form-row">
              <label htmlFor="guardianEmail">Email address of your parent/guardian</label>
              <input id="guardianEmail" name="guardianEmail" type="email" maxLength={256} required value={form.guardianEmail} onChange={handleChange} />
            </div>

            <h3 className="form-section-title">Grade qualification</h3>

            {requirements ? (
              <div className="form-guidance">
                <p className="form-guidance-title">{requirements.heading}</p>
                <ul>
                  {requirements.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p>
                  <strong>Important:</strong> {GRADE_CERTIFICATION_NOTE}
                </p>
              </div>
            ) : (
              <p className="form-note">Select a level above to see its grade qualification requirements.</p>
            )}

            <div className="form-row">
              <label htmlFor="gradeAverage">General average</label>
              <input
                id="gradeAverage"
                name="gradeAverage"
                type="number"
                step="0.01"
                min="0"
                max="999.99"
                required
                value={form.gradeAverage}
                onChange={handleChange}
              />
            </div>

            {grants && (
              <div className="form-guidance">
                <p className="form-guidance-title">{grants.caption}</p>
                <div className="form-table-wrap">
                  <table className="form-table">
                    <thead>
                      <tr>
                        {grants.columns.map((column) => (
                          <th key={column}>{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {grants.rows.map((row) => (
                        <tr key={row[0]}>
                          {row.map((cell, index) => (
                            <td key={index}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {grants.footnote && <p className="form-note">{grants.footnote}</p>}
                <p className="form-note">{GRANTS_NOTE}</p>
              </div>
            )}

            <h3 className="form-section-title">Documentary requirements</h3>
            <div className="form-guidance">
              <ol>
                {DOCUMENTARY_REQUIREMENTS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
              <p className="form-note">
                After submitting, upload these as PDF files on the <Link to="/documents">Documents</Link> page.
              </p>
              <p className="form-guidance-title">Screening procedure</p>
              <ol>
                {SCREENING_STEPS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </div>

            <h3 className="form-section-title">Data privacy consent</h3>
            <p className="form-note">{CONSENT_READ_NOTE}</p>
            <div className="form-guidance form-consent-text">
              {DATA_PRIVACY_CONSENT.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <p className="form-guidance-title">Consent form - rationale</p>
              {CONSENT_RATIONALE.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <p className="form-guidance-title">Data privacy notice</p>
              <p>{DATA_PRIVACY_NOTICE}</p>
              <p className="form-guidance-title">Consent and agreement</p>
              <ol>
                {CONSENT_AND_AGREEMENT.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </div>

            {CONSENT_QUESTIONS.map((question) => (
              <fieldset className="form-radio-group" key={question.name}>
                <legend>{question.label}</legend>
                <label>
                  <input type="radio" name={question.name} value="yes" checked={form[question.name] === "yes"} onChange={handleChange} /> Yes
                </label>
                <label>
                  <input type="radio" name={question.name} value="no" checked={form[question.name] === "no"} onChange={handleChange} /> No
                </label>
              </fieldset>
            ))}

            {answeredNo && (
              <p className="form-hint">
                Consent is required to apply. {SCHOOL_NAME} cannot accept the application unless all three questions are answered Yes.
              </p>
            )}

            <button type="submit" disabled={isSubmitting || isLoading || scholarships.length === 0 || !detailsComplete || !allConsented}>
              {isSubmitting ? "Submitting..." : "Submit Application"}
            </button>
          </form>
        )}
      </Card>

      <ConfirmSubmissionModal
        open={confirming}
        onCancel={() => setConfirming(false)}
        onConfirm={sendApplication}
        isSubmitting={isSubmitting}
      />
    </AppLayout>
  );
}
