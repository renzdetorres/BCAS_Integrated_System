import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getEvaluatorDashboard } from "../api/evaluatorDashboardApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card, { StatCard } from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import "./EvaluatorDashboardPage.css";

function formatDate(isoDateTime) {
  return new Date(isoDateTime).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function ApplicationQueueList({ applications, emptyMessage }) {
  if (applications.length === 0) return <p>{emptyMessage}</p>;
  return (
    <ul className="evaluator-application-list">
      {applications.map((application) => (
        <li key={application.applicationId}>
          <Link
            className="evaluator-application-link"
            to={`/evaluator/scholarship-applications/${application.applicationId}`}
          >
            <div className="evaluator-application-header">
              <span className="evaluator-application-name">{application.applicantName}</span>
              <StatusBadge status={application.status} />
            </div>
            <p className="evaluator-application-meta">
              {application.scholarshipName} &middot; {application.scholarshipType} &middot; Grade Average{" "}
              {application.gradeAverage} &middot; Submitted {formatDate(application.submittedAt)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function EvaluatorDashboardPage() {
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
    <AppLayout title="Evaluator Dashboard">
      {isLoading && (
        <Card>
          <p>Loading...</p>
        </Card>
      )}

      {errorMessage && (
        <Card>
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        </Card>
      )}

      {!isLoading && !errorMessage && dashboard && (
        <>
          <section className="evaluator-stat-grid">
            <StatCard label="Pending Evaluations" value={dashboard.pendingEvaluationsCount} />
          </section>

          <Card>
            <h2>Scholarship Application Queue</h2>
            <ApplicationQueueList
              applications={dashboard.queue}
              emptyMessage="No scholarship applications awaiting evaluation."
            />
          </Card>

          <Card>
            <h2>Recently Evaluated</h2>
            <ApplicationQueueList
              applications={dashboard.recentlyEvaluated}
              emptyMessage="No scholarship applications evaluated yet."
            />
          </Card>
        </>
      )}
    </AppLayout>
  );
}
