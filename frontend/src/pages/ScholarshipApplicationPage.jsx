import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getAvailableScholarships,
  getMyScholarshipApplications,
  submitScholarshipApplication,
} from "../api/scholarshipApi.js";
import { ApiError } from "../api/apiClient.js";
import "./ScholarshipApplicationPage.css";

const initialForm = { scholarshipId: "", gradeAverage: "" };

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

  useEffect(() => {
    let cancelled = false;

    Promise.all([getAvailableScholarships(), getMyScholarshipApplications()])
      .then(([scholarshipData, applicationData]) => {
        if (cancelled) return;
        setScholarships(scholarshipData);
        setApplications(applicationData);
        if (scholarshipData.length > 0) {
          setForm((prev) => ({ ...prev, scholarshipId: String(scholarshipData[0].scholarshipId) }));
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof ApiError ? error.message : "Failed to load scholarships.");
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
      const created = await submitScholarshipApplication({
        scholarshipId: Number(form.scholarshipId),
        gradeAverage: Number(form.gradeAverage),
      });
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
    <main className="scholarship-page">
      <div className="scholarship-shell">
        <Link className="scholarship-back-link" to="/portal">
          &larr; Back to dashboard
        </Link>

        <section className="scholarship-card">
          <h1>Submit Scholarship Application</h1>

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

          {!isLoading && scholarships.length === 0 && !errorMessage && (
            <p>No scholarship slots are currently open for applications.</p>
          )}

          {(isLoading || scholarships.length > 0) && (
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
                      {s.name} ({s.scholarshipType}) - {s.remainingSlots} slot
                      {s.remainingSlots === 1 ? "" : "s"} left
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <label htmlFor="gradeAverage">Grade average</label>
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

              <button type="submit" disabled={isSubmitting || isLoading || scholarships.length === 0}>
                {isSubmitting ? "Submitting..." : "Submit Application"}
              </button>
            </form>
          )}
        </section>

        <section className="scholarship-card">
          <h2>My Scholarship Applications</h2>
          {isLoading && <p>Loading...</p>}
          {!isLoading && applications.length === 0 && <p>No applications submitted yet.</p>}
          {!isLoading && applications.length > 0 && (
            <ul className="scholarship-list">
              {applications.map((application) => (
                <li key={application.applicationId}>
                  <div className="scholarship-list-header">
                    <span className="scholarship-name">{application.scholarshipName}</span>
                    <span className={`scholarship-status status-${application.status.toLowerCase()}`}>
                      {application.status}
                    </span>
                  </div>
                  <p className="scholarship-meta">
                    {application.scholarshipType} &middot; Grade average {application.gradeAverage} &middot;
                    Submitted {formatDate(application.submittedAt)}
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
