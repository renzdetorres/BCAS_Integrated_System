import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  APPLICATION_TYPES,
  getMyAdmissionApplications,
  submitAdmissionApplication,
} from "../api/admissionApi.js";
import { ApiError } from "../api/apiClient.js";
import { DEPARTMENT_OPTIONS, programOptionLabel, programsFor } from "../config/departments.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import ConfirmSubmissionModal from "../components/ConfirmSubmissionModal.jsx";
import { REQUIRED_NOTE, requiredDocumentsFor } from "../config/requiredDocuments.js";
import "./AdmissionApplicationPage.css";

const initialForm = {
  applicationType: APPLICATION_TYPES[0].value,
  department: "",
  courseAppliedFor: "",
  previousSchool: "",
};

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function AdmissionApplicationPage() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [errorMessage, setErrorMessage] = useState(null);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getMyAdmissionApplications()
      .then((data) => {
        if (!cancelled) setApplications(data);
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof ApiError ? error.message : "Failed to load applications.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    // The course choices depend on the department, so changing it clears
    // a course picked for the previous one.
    setForm((prev) => ({ ...prev, [name]: value, ...(name === "department" ? { courseAppliedFor: "" } : {}) }));
  }

  // A department with a fixed program list (College) picks from it; any
  // other takes its strand or grade level as typed.
  const programs = programsFor(form.department);

  function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    setProfileIncomplete(false);

    if (!form.department) {
      setErrorMessage("Choose the department you are applying to.");
      return;
    }

    if (programs && !form.courseAppliedFor) {
      setErrorMessage(`Choose a program for the ${form.department} department.`);
      return;
    }

    if (!form.previousSchool.trim()) {
      setErrorMessage("Enter your previous school.");
      return;
    }

    setConfirming(true);
  }

  async function sendApplication() {
    setIsSubmitting(true);

    try {
      const created = await submitAdmissionApplication(form);
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

  // One admission application per applicant: once it exists the form stays on
  // screen, greyed out and read-only, showing what was submitted.
  const submitted = applications[0] ?? null;
  const values = submitted ?? form;
  const readOnly = Boolean(submitted);
  const shownPrograms = programsFor(values.department);
  const requiredDocuments = requiredDocumentsFor(values.applicationType);

  return (
    <AppLayout title="My Application">
      <Card className={`admission-card${readOnly ? " admission-card-submitted" : ""}`}>
        <h2>{readOnly ? "Your Admission Application" : "Submit Admission Application"}</h2>

        {readOnly && (
          <div className="admission-submitted-note" role="status">
            <div className="admission-submitted-head">
              <StatusBadge status={submitted.status} />
              <span>Submitted {formatDate(submitted.submittedAt)}</span>
            </div>
            <p>
              Your application has been submitted and can no longer be edited or sent again. Next, follow its progress under{" "}
              <Link to="/application-tracking">Application Tracking</Link>, upload your <Link to="/documents">documents</Link>, and
              watch <Link to="/announcements">Announcements</Link> for your exam schedule.
            </p>
          </div>
        )}

        {isLoading && <p>Loading...</p>}

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

        {!isLoading && (
          <form onSubmit={handleSubmit} noValidate className={readOnly ? "form-readonly" : undefined}>
            <fieldset disabled={readOnly || isSubmitting} className="form-fieldset">
              <div className="form-row">
                <label htmlFor="applicationType">Application type</label>
                <select id="applicationType" name="applicationType" value={values.applicationType} onChange={handleChange}>
                  {APPLICATION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <label htmlFor="department">Department</label>
                <select id="department" name="department" required value={values.department ?? ""} onChange={handleChange}>
                  <option value="" disabled>
                    Select a department
                  </option>
                  {DEPARTMENT_OPTIONS.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <label htmlFor="courseAppliedFor">{shownPrograms ? "Program" : "Strand or grade level"}</label>
                {shownPrograms ? (
                  <select id="courseAppliedFor" name="courseAppliedFor" required value={values.courseAppliedFor} onChange={handleChange}>
                    <option value="" disabled>
                      Select a program
                    </option>
                    {shownPrograms.map((program) => (
                      <option key={program.code} value={program.code}>
                        {programOptionLabel(program)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="courseAppliedFor"
                    name="courseAppliedFor"
                    type="text"
                    required
                    placeholder={values.department ? "For example: STEM, Grade 7" : "Choose a department first"}
                    disabled={!values.department}
                    value={values.courseAppliedFor}
                    onChange={handleChange}
                  />
                )}
              </div>

              <div className="form-row">
                <label htmlFor="previousSchool">Previous school</label>
                <input id="previousSchool" name="previousSchool" type="text" required value={values.previousSchool} onChange={handleChange} />
              </div>
            </fieldset>

            {!readOnly && (
              <>
                <div className="form-guidance">
                  <p className="form-guidance-title">Documents you will need</p>
                  <ul className="required-docs">
                    {requiredDocuments.map((doc) => (
                      <li key={doc.type}>
                        {doc.label}
                        {doc.required ? <span className="required-mark" title="Required"> *</span> : <em> ({doc.note})</em>}
                      </li>
                    ))}
                  </ul>
                  <p className="form-note">{REQUIRED_NOTE} You upload them on the Documents page after submitting.</p>
                </div>

                <button type="submit" disabled={isSubmitting}>
                  Submit Application
                </button>
              </>
            )}
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
