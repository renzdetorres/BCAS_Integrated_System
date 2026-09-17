import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  APPLICATION_TYPES,
  getMyAdmissionApplications,
  submitAdmissionApplication,
} from "../api/admissionApi.js";
import { ApiError } from "../api/apiClient.js";
import "./AdmissionApplicationPage.css";

const initialForm = {
  applicationType: APPLICATION_TYPES[0].value,
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
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    setProfileIncomplete(false);
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
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="admission-page">
      <div className="admission-shell">
        <Link className="admission-back-link" to="/portal">
          &larr; Back to dashboard
        </Link>

        <section className="admission-card">
          <h1>Submit Admission Application</h1>

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

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-row">
              <label htmlFor="applicationType">Application type</label>
              <select
                id="applicationType"
                name="applicationType"
                value={form.applicationType}
                onChange={handleChange}
              >
                {APPLICATION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <label htmlFor="courseAppliedFor">Course applied for</label>
              <input
                id="courseAppliedFor"
                name="courseAppliedFor"
                type="text"
                required
                value={form.courseAppliedFor}
                onChange={handleChange}
              />
            </div>

            <div className="form-row">
              <label htmlFor="previousSchool">Previous school</label>
              <input
                id="previousSchool"
                name="previousSchool"
                type="text"
                required
                value={form.previousSchool}
                onChange={handleChange}
              />
            </div>

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Application"}
            </button>
          </form>
        </section>

        <section className="admission-card">
          <h2>My Applications</h2>
          {isLoading && <p>Loading...</p>}
          {!isLoading && applications.length === 0 && <p>No applications submitted yet.</p>}
          {!isLoading && applications.length > 0 && (
            <ul className="admission-list">
              {applications.map((application) => (
                <li key={application.applicationId}>
                  <div className="admission-list-header">
                    <span className="admission-type">
                      {APPLICATION_TYPES.find((t) => t.value === application.applicationType)?.label ??
                        application.applicationType}
                    </span>
                    <span className={`admission-status status-${application.status.toLowerCase()}`}>
                      {application.status}
                    </span>
                  </div>
                  <p className="admission-course">{application.courseAppliedFor}</p>
                  <p className="admission-meta">
                    Previous school: {application.previousSchool} &middot; Submitted{" "}
                    {formatDate(application.submittedAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
