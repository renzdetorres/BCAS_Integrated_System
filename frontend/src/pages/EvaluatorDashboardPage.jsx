import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getEvaluatorDashboard } from "../api/evaluatorDashboardApi.js";
import { ApiError } from "../api/apiClient.js";
import { useSession } from "../context/SessionContext.jsx";
import { useLogout } from "../hooks/useLogout.js";
import "./EvaluatorDashboardPage.css";

function formatDate(isoDateTime) {
  return new Date(isoDateTime).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function EvaluatorDashboardPage() {
  const { session } = useSession();
  const handleLogout = useLogout();
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getEvaluatorDashboard()
      .then((data) => {
        if (!cancelled) setDashboard(data);
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof ApiError ? error.message : "Failed to load dashboard.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="evaluator-dashboard-page">
      <div className="evaluator-dashboard-shell">
        <header className="evaluator-dashboard-header">
          <div>
            <span className="evaluator-dashboard-badge">Evaluator</span>
            <h1>Evaluator Dashboard</h1>
            <p>
              Signed in as <strong>{session.email}</strong>.
            </p>
          </div>
          <button type="button" onClick={handleLogout}>
            Log Out
          </button>
        </header>

        {isLoading && (
          <section className="evaluator-dashboard-card">
            <p>Loading...</p>
          </section>
        )}

        {errorMessage && (
          <section className="evaluator-dashboard-card">
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          </section>
        )}

        {!isLoading && !errorMessage && dashboard && (
          <>
            <section className="evaluator-stat-grid">
              <div className="evaluator-stat-tile evaluator-stat-pending">
                <span className="evaluator-stat-value">{dashboard.pendingEvaluationsCount}</span>
                <span className="evaluator-stat-label">Pending Evaluations</span>
              </div>
            </section>

            <section className="evaluator-dashboard-card">
              <h2>Scholarship Application Queue</h2>
              {dashboard.queue.length === 0 && <p>No scholarship applications awaiting evaluation.</p>}
              {dashboard.queue.length > 0 && (
                <ul className="evaluator-application-list">
                  {dashboard.queue.map((application) => (
                    <li key={application.applicationId}>
                      <Link
                        className="evaluator-application-link"
                        to={`/evaluator/scholarship-applications/${application.applicationId}`}
                      >
                        <div className="evaluator-application-header">
                          <span className="evaluator-application-name">{application.applicantName}</span>
                          <span className={`evaluator-application-status status-${application.status.toLowerCase()}`}>
                            {application.status}
                          </span>
                        </div>
                        <p className="evaluator-application-meta">
                          {application.scholarshipName} &middot; {application.scholarshipType} &middot; Grade
                          Average {application.gradeAverage} &middot; Submitted{" "}
                          {formatDate(application.submittedAt)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="evaluator-dashboard-card">
              <h2>Recently Evaluated</h2>
              {dashboard.recentlyEvaluated.length === 0 && <p>No scholarship applications evaluated yet.</p>}
              {dashboard.recentlyEvaluated.length > 0 && (
                <ul className="evaluator-application-list">
                  {dashboard.recentlyEvaluated.map((application) => (
                    <li key={application.applicationId}>
                      <Link
                        className="evaluator-application-link"
                        to={`/evaluator/scholarship-applications/${application.applicationId}`}
                      >
                        <div className="evaluator-application-header">
                          <span className="evaluator-application-name">{application.applicantName}</span>
                          <span className={`evaluator-application-status status-${application.status.toLowerCase()}`}>
                            {application.status}
                          </span>
                        </div>
                        <p className="evaluator-application-meta">
                          {application.scholarshipName} &middot; {application.scholarshipType} &middot; Grade
                          Average {application.gradeAverage} &middot; Submitted{" "}
                          {formatDate(application.submittedAt)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
