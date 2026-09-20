import { useEffect, useState } from "react";
import { getUpcomingDeadlines } from "../api/dashboardApi.js";
import { ApiError } from "../api/apiClient.js";
import { useSession } from "../context/SessionContext.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import "./ApplicantDashboardPage.css";

const DEADLINE_TYPE_LABELS = {
  ScholarshipDeadline: "Scholarship Deadline",
  DocumentDeadline: "Document Deadline",
  EnrollmentPeriod: "Enrollment Period",
};

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ApplicantDashboardPage() {
  const { session } = useSession();
  const [deadlines, setDeadlines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getUpcomingDeadlines()
      .then((data) => {
        if (!cancelled) setDeadlines(data);
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof ApiError ? error.message : "Failed to load deadlines.");
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
    <AppLayout title={`Welcome back, ${session.firstName}!`}>
      <Card>
        <h2 className="dashboard-section-title">Upcoming Deadlines</h2>
        {isLoading && <p className="dashboard-meta">Loading...</p>}
        {errorMessage && (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        )}
        {!isLoading && !errorMessage && deadlines.length === 0 && (
          <p className="dashboard-meta">No upcoming deadlines.</p>
        )}
        {!isLoading && deadlines.length > 0 && (
          <ul className="deadline-list">
            {deadlines.map((deadline) => (
              <li key={`${deadline.type}-${deadline.date}`}>
                <span className="deadline-type">
                  {DEADLINE_TYPE_LABELS[deadline.type] ?? deadline.type}
                </span>
                <span className="deadline-title">{deadline.title}</span>
                <span className="deadline-date">{formatDate(deadline.date)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AppLayout>
  );
}
