import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSupportStaffDashboard } from "../api/supportStaffDashboardApi.js";
import { ApiError } from "../api/apiClient.js";
import { useSession } from "../context/SessionContext.jsx";
import { useLogout } from "../hooks/useLogout.js";
import "./SupportStaffDashboardPage.css";

export default function SupportStaffDashboardPage() {
  const { session } = useSession();
  const handleLogout = useLogout();
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getSupportStaffDashboard()
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
    <main className="ss-dashboard-page">
      <div className="ss-dashboard-shell">
        <header className="ss-dashboard-header">
          <div>
            <span className="ss-dashboard-badge">Support Staff</span>
            <h1>Support Staff Dashboard</h1>
            <p>
              Signed in as <strong>{session.email}</strong>.
            </p>
          </div>
          <button type="button" onClick={handleLogout}>
            Log Out
          </button>
        </header>

        <div className="ss-dashboard-links">
          <Link className="ss-dashboard-link" to="/support-staff/documents">
            Document Verification
          </Link>
          <Link className="ss-dashboard-link" to="/support-staff/applicants">
            Applicant Records
          </Link>
        </div>

        {isLoading && (
          <section className="ss-dashboard-card">
            <p>Loading...</p>
          </section>
        )}

        {errorMessage && (
          <section className="ss-dashboard-card">
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          </section>
        )}

        {!isLoading && !errorMessage && dashboard && (
          <section className="ss-stat-grid">
            <div className="ss-stat-tile ss-stat-pending">
              <span className="ss-stat-value">{dashboard.pendingVerificationCount}</span>
              <span className="ss-stat-label">Pending Verification</span>
            </div>
            <div className="ss-stat-tile ss-stat-verified">
              <span className="ss-stat-value">{dashboard.verifiedTodayCount}</span>
              <span className="ss-stat-label">Verified Today</span>
            </div>
            <div className="ss-stat-tile ss-stat-flagged">
              <span className="ss-stat-value">{dashboard.flaggedDocsCount}</span>
              <span className="ss-stat-label">Flagged Documents</span>
            </div>
            <div className="ss-stat-tile">
              <span className="ss-stat-value">{dashboard.totalApplicants}</span>
              <span className="ss-stat-label">Total Applicants</span>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
