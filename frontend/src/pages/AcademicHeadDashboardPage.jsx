import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getApplicationsReadyForDecision } from "../api/academicHeadScholarshipApplicationsApi.js";
import { getAdminDashboard } from "../api/adminDashboardApi.js";
import { ApiError } from "../api/apiClient.js";
import { useSession } from "../context/SessionContext.jsx";
import { useLogout } from "../hooks/useLogout.js";
import "./AcademicHeadDashboardPage.css";

function formatDate(isoDateTime) {
  return new Date(isoDateTime).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function AcademicHeadDashboardPage() {
  const { session } = useSession();
  const handleLogout = useLogout();
  const [queue, setQueue] = useState([]);
  const [oversight, setOversight] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getApplicationsReadyForDecision(), getAdminDashboard()])
      .then(([queueData, oversightData]) => {
        if (cancelled) return;
        setQueue(queueData);
        setOversight(oversightData);
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
    <main className="ah-dashboard-page">
      <div className="ah-dashboard-shell">
        <header className="ah-dashboard-header">
          <div>
            <span className="ah-dashboard-badge">Academic Head</span>
            <h1>Academic Head Dashboard</h1>
            <p>
              Signed in as <strong>{session.email}</strong>.
            </p>
          </div>
          <button type="button" onClick={handleLogout}>
            Log Out
          </button>
        </header>

        <section className="ah-dashboard-card">
          <h2>Management</h2>
          <p className="ah-management-subtitle">
            Available if an Admin-Registrar has authorized the Academic Head role for each area.
          </p>
          <div className="ah-management-links">
            <Link className="ah-management-link" to="/academic-head/scholarships">
              Scholarship Slots
            </Link>
            <Link className="ah-management-link" to="/academic-head/announcements">
              Announcements
            </Link>
          </div>
        </section>

        {isLoading && (
          <section className="ah-dashboard-card">
            <p>Loading...</p>
          </section>
        )}

        {errorMessage && (
          <section className="ah-dashboard-card">
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          </section>
        )}

        {!isLoading && !errorMessage && (
          <>
            <section className="ah-dashboard-card">
              <h2>Applications Awaiting Decision</h2>
              {queue.length === 0 && <p>No scholarship applications are waiting on a final decision.</p>}
              {queue.length > 0 && (
                <ul className="ah-queue-list">
                  {queue.map((application) => (
                    <li key={application.applicationId}>
                      <Link
                        className="ah-queue-link"
                        to={`/academic-head/scholarship-applications/${application.applicationId}`}
                      >
                        <div className="ah-queue-header">
                          <span className="ah-queue-name">{application.applicantName}</span>
                          <span className="ah-queue-status">{application.status}</span>
                        </div>
                        <p className="ah-queue-meta">
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

            {oversight && (
              <>
                <section className="ah-oversight-heading">
                  <h2>Admissions Oversight (Admin-Registrar)</h2>
                  <p>Read-only, for context in approval decisions.</p>
                </section>

                <section className="ah-stat-grid">
                  <div className="ah-stat-tile">
                    <span className="ah-stat-value">{oversight.totalApplications}</span>
                    <span className="ah-stat-label">Total Applications</span>
                  </div>
                  <div className="ah-stat-tile">
                    <span className="ah-stat-value">{oversight.totalApplicants}</span>
                    <span className="ah-stat-label">Total Applicants</span>
                  </div>
                  <div className="ah-stat-tile ah-stat-pending">
                    <span className="ah-stat-value">{oversight.pendingCount}</span>
                    <span className="ah-stat-label">Pending</span>
                  </div>
                  <div className="ah-stat-tile ah-stat-approved">
                    <span className="ah-stat-value">{oversight.approvedCount}</span>
                    <span className="ah-stat-label">Approved</span>
                  </div>
                  <div className="ah-stat-tile ah-stat-rejected">
                    <span className="ah-stat-value">{oversight.rejectedCount}</span>
                    <span className="ah-stat-label">Rejected</span>
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
