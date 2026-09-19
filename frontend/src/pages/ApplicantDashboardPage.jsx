import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUpcomingDeadlines } from "../api/dashboardApi.js";
import { ApiError } from "../api/apiClient.js";
import { useSession } from "../context/SessionContext.jsx";
import { useLogout } from "../hooks/useLogout.js";
import "./ApplicantDashboardPage.css";

const DEADLINE_TYPE_LABELS = {
  ScholarshipDeadline: "Scholarship Deadline",
  DocumentDeadline: "Document Deadline",
  EnrollmentPeriod: "Enrollment Period",
};

const QUICK_LINKS = [
  { to: "/profile", label: "Settings" },
  { to: "/applications/history", label: "My Application" },
  { to: "/application-tracking", label: "Application Tracking" },
  { to: "/scholarships", label: "Scholarship Application" },
  { to: "/documents", label: "Documents" },
  { to: "/exam-schedule", label: "Entrance Exam Schedule" },
  { to: "/exam-permit", label: "Exam Permit" },
  { to: "/announcements", label: "Announcements" },
];

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ApplicantDashboardPage() {
  const { session } = useSession();
  const handleLogout = useLogout();
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
    <main className="dashboard-page">
      <div className="dashboard-shell">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-eyebrow">Applicant Dashboard</p>
            <h1>Welcome back, {session.firstName}!</h1>
          </div>
          <button type="button" onClick={handleLogout}>
            Log Out
          </button>
        </header>

        <section className="dashboard-card">
          <h2>Upcoming Deadlines</h2>
          {isLoading && <p>Loading...</p>}
          {errorMessage && (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          )}
          {!isLoading && !errorMessage && deadlines.length === 0 && <p>No upcoming deadlines.</p>}
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
        </section>

        <section className="dashboard-card">
          <h2>Quick Links</h2>
          <div className="quick-links">
            {QUICK_LINKS.map((link) => (
              <Link key={link.to} className="quick-link" to={link.to}>
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
