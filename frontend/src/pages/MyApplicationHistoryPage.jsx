import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyApplicationHistory } from "../api/applicationHistoryApi.js";
import { APPLICATION_TYPES } from "../api/admissionApi.js";
import { ApiError } from "../api/apiClient.js";
import "./MyApplicationHistoryPage.css";

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function admissionTypeLabel(applicationType) {
  return APPLICATION_TYPES.find((t) => t.value === applicationType)?.label ?? applicationType;
}

function applicationTitle(application) {
  return application.category === "Admission" ? application.courseAppliedFor : application.scholarshipName;
}

export default function MyApplicationHistoryPage() {
  const [applications, setApplications] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getMyApplicationHistory()
      .then((data) => {
        if (cancelled) return;
        setApplications(data);
        if (data.length > 0) setSelectedId(data[0].applicationId);
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof ApiError ? error.message : "Failed to load application history.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedApplication = applications.find((a) => a.applicationId === selectedId) ?? null;

  return (
    <main className="history-page">
      <div className="history-shell">
        <Link className="history-back-link" to="/portal">
          &larr; Back to dashboard
        </Link>

        <header className="history-header">
          <h1>My Application</h1>
          <div className="history-actions">
            <Link className="history-action-link" to="/applications">
              Submit Admission Application
            </Link>
            <Link className="history-action-link" to="/scholarships">
              Submit Scholarship Application
            </Link>
          </div>
        </header>

        {errorMessage && (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        )}

        {isLoading && <p>Loading...</p>}

        {!isLoading && !errorMessage && applications.length === 0 && (
          <section className="history-card">
            <p>No applications submitted yet.</p>
          </section>
        )}

        {!isLoading && applications.length > 0 && (
          <div className="history-layout">
            <section className="history-card history-list-card">
              <h2>All Applications</h2>
              <ul className="history-list">
                {applications.map((application) => (
                  <li key={application.applicationId}>
                    <button
                      type="button"
                      className={`history-list-item${
                        application.applicationId === selectedId ? " history-list-item-selected" : ""
                      }`}
                      onClick={() => setSelectedId(application.applicationId)}
                    >
                      <div className="history-list-header">
                        <span className={`history-category history-category-${application.category.toLowerCase()}`}>
                          {application.category}
                        </span>
                        <span className={`history-status status-${application.status.toLowerCase()}`}>
                          {application.status}
                        </span>
                      </div>
                      <p className="history-title">{applicationTitle(application)}</p>
                      <p className="history-meta">Submitted {formatDate(application.submittedAt)}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="history-card history-detail-card">
              <h2>Application Details</h2>
              {!selectedApplication && <p>Select an application to see its details.</p>}
              {selectedApplication && (
                <div className="history-detail">
                  <div className="history-detail-row">
                    <span className="history-detail-label">Category</span>
                    <span>{selectedApplication.category}</span>
                  </div>
                  <div className="history-detail-row">
                    <span className="history-detail-label">Status</span>
                    <span className={`history-status status-${selectedApplication.status.toLowerCase()}`}>
                      {selectedApplication.status}
                    </span>
                  </div>
                  <div className="history-detail-row">
                    <span className="history-detail-label">Submitted</span>
                    <span>{formatDate(selectedApplication.submittedAt)}</span>
                  </div>

                  {selectedApplication.category === "Admission" && (
                    <>
                      <div className="history-detail-row">
                        <span className="history-detail-label">Application type</span>
                        <span>{admissionTypeLabel(selectedApplication.applicationType)}</span>
                      </div>
                      <div className="history-detail-row">
                        <span className="history-detail-label">Course applied for</span>
                        <span>{selectedApplication.courseAppliedFor}</span>
                      </div>
                      <div className="history-detail-row">
                        <span className="history-detail-label">Previous school</span>
                        <span>{selectedApplication.previousSchool}</span>
                      </div>
                    </>
                  )}

                  {selectedApplication.category === "Scholarship" && (
                    <>
                      <div className="history-detail-row">
                        <span className="history-detail-label">Scholarship</span>
                        <span>{selectedApplication.scholarshipName}</span>
                      </div>
                      <div className="history-detail-row">
                        <span className="history-detail-label">Scholarship type</span>
                        <span>{selectedApplication.scholarshipType}</span>
                      </div>
                      <div className="history-detail-row">
                        <span className="history-detail-label">Grade average</span>
                        <span>{selectedApplication.gradeAverage}</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
