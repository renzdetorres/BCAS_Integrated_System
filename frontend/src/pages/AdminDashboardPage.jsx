import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminDashboard } from "../api/adminDashboardApi.js";
import { APPLICATION_TYPES } from "../api/admissionApi.js";
import { ApiError } from "../api/apiClient.js";
import { useSession } from "../context/SessionContext.jsx";
import { useLogout } from "../hooks/useLogout.js";
import "./AdminDashboardPage.css";

function formatDate(isoDateTime) {
  return new Date(isoDateTime).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function admissionTypeLabel(applicationType) {
  return APPLICATION_TYPES.find((t) => t.value === applicationType)?.label ?? applicationType;
}

export default function AdminDashboardPage() {
  const { session } = useSession();
  const handleLogout = useLogout();
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getAdminDashboard()
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
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <header className="admin-dashboard-header">
          <div>
            <span className="admin-dashboard-badge">Admin-Registrar</span>
            <h1>Admin Dashboard</h1>
            <p>
              Signed in as <strong>{session.email}</strong>.
            </p>
          </div>
          <button type="button" onClick={handleLogout}>
            Log Out
          </button>
        </header>

        <div className="admin-dashboard-links">
          <Link className="admin-dashboard-link" to="/admin/staff">
            Create Staff Account
          </Link>
          <Link className="admin-dashboard-link" to="/admin/users">
            Manage Accounts
          </Link>
          <Link className="admin-dashboard-link" to="/admin/notification-settings">
            Notification Settings
          </Link>
        </div>

        {isLoading && (
          <section className="admin-dashboard-card">
            <p>Loading...</p>
          </section>
        )}

        {errorMessage && (
          <section className="admin-dashboard-card">
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          </section>
        )}

        {!isLoading && !errorMessage && dashboard && (
          <>
            <section className="admin-stat-grid">
              <div className="admin-stat-tile">
                <span className="admin-stat-value">{dashboard.totalApplications}</span>
                <span className="admin-stat-label">Total Applications</span>
              </div>
              <div className="admin-stat-tile">
                <span className="admin-stat-value">{dashboard.totalApplicants}</span>
                <span className="admin-stat-label">Total Applicants</span>
              </div>
              <div className="admin-stat-tile admin-stat-pending">
                <span className="admin-stat-value">{dashboard.pendingCount}</span>
                <span className="admin-stat-label">Pending</span>
              </div>
              <div className="admin-stat-tile admin-stat-approved">
                <span className="admin-stat-value">{dashboard.approvedCount}</span>
                <span className="admin-stat-label">Approved</span>
              </div>
              <div className="admin-stat-tile admin-stat-rejected">
                <span className="admin-stat-value">{dashboard.rejectedCount}</span>
                <span className="admin-stat-label">Rejected</span>
              </div>
            </section>

            <section className="admin-dashboard-card">
              <h2>Applicants by Program</h2>
              {dashboard.byProgram.length === 0 && <p>No admission applications submitted yet.</p>}
              {dashboard.byProgram.length > 0 && (
                <ul className="admin-program-list">
                  {dashboard.byProgram.map((entry) => (
                    <li key={entry.program}>
                      <span className="admin-program-name">{entry.program}</span>
                      <span className="admin-program-count">{entry.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="admin-dashboard-card">
              <h2>Recent Applications</h2>
              {dashboard.recentApplications.length === 0 && <p>No admission applications submitted yet.</p>}
              {dashboard.recentApplications.length > 0 && (
                <ul className="admin-recent-list">
                  {dashboard.recentApplications.map((application) => (
                    <li key={application.applicationId}>
                      <div className="admin-recent-header">
                        <span className="admin-recent-name">{application.applicantName}</span>
                        <span className={`admin-recent-status status-${application.status.toLowerCase()}`}>
                          {application.status}
                        </span>
                      </div>
                      <p className="admin-recent-meta">
                        {admissionTypeLabel(application.applicationType)} &middot; {application.courseAppliedFor}{" "}
                        &middot; Submitted {formatDate(application.submittedAt)}
                      </p>
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
