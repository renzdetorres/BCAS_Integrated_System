import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { searchApplications } from "../api/adminApplicationsApi.js";
import { ApiError } from "../api/apiClient.js";
import "./AdminApplicationDetailPage.css";

function formatDateTime(isoDateTime) {
  return new Date(isoDateTime).toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminApplicationDetailPage() {
  const { applicationId } = useParams();
  const [application, setApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    searchApplications()
      .then((data) => {
        if (cancelled) return;
        setApplication(data.find((a) => a.applicationId === applicationId) ?? null);
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof ApiError ? error.message : "Failed to load this application.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  return (
    <main className="admin-app-detail-page">
      <div className="admin-app-detail-card">
        <Link className="admin-app-detail-back-link" to="/admin/applications">
          &larr; Back to applications
        </Link>

        {isLoading && <p>Loading...</p>}
        {errorMessage && (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        )}
        {!isLoading && !errorMessage && !application && <p>Application not found.</p>}

        {!isLoading && !errorMessage && application && (
          <>
            <div className="admin-app-detail-header">
              <span className={`category-badge category-${application.category.toLowerCase()}`}>
                {application.category}
              </span>
              <span className={`status-badge status-${application.status.toLowerCase()}`}>
                {application.status}
              </span>
            </div>
            <h1>{application.applicantName}</h1>
            <p className="admin-app-detail-email">{application.applicantEmail}</p>

            <dl className="admin-app-detail-list">
              {application.category === "Admission" ? (
                <>
                  <div>
                    <dt>Application Type</dt>
                    <dd>{application.applicationType}</dd>
                  </div>
                  <div>
                    <dt>Course Applied For</dt>
                    <dd>{application.courseAppliedFor}</dd>
                  </div>
                  {application.previousSchool && (
                    <div>
                      <dt>Previous School</dt>
                      <dd>{application.previousSchool}</dd>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <dt>Scholarship</dt>
                    <dd>{application.scholarshipName}</dd>
                  </div>
                  <div>
                    <dt>Scholarship Type</dt>
                    <dd>{application.scholarshipType}</dd>
                  </div>
                  <div>
                    <dt>Grade Average</dt>
                    <dd>{application.gradeAverage}</dd>
                  </div>
                </>
              )}
              <div>
                <dt>Submitted</dt>
                <dd>{formatDateTime(application.submittedAt)}</dd>
              </div>
            </dl>
          </>
        )}
      </div>
    </main>
  );
}
