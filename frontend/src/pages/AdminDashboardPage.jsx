import { useEffect, useState } from "react";
import { getAdminDashboard } from "../api/adminDashboardApi.js";
import { APPLICATION_TYPES } from "../api/admissionApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card, { StatCard } from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
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
    <AppLayout title="Admin Dashboard">
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
          <section className="admin-stat-grid">
            <StatCard label="Total Applications" value={dashboard.totalApplications} />
            <StatCard label="Total Applicants" value={dashboard.totalApplicants} />
            <StatCard label="Pending" value={dashboard.pendingCount} />
            <StatCard label="Approved" value={dashboard.approvedCount} />
            <StatCard label="Rejected" value={dashboard.rejectedCount} />
          </section>

          <Card>
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
          </Card>

          <Card>
            <h2>Recent Applications</h2>
            {dashboard.recentApplications.length === 0 && <p>No admission applications submitted yet.</p>}
            {dashboard.recentApplications.length > 0 && (
              <ul className="admin-recent-list">
                {dashboard.recentApplications.map((application) => (
                  <li key={application.applicationId}>
                    <div className="admin-recent-header">
                      <span className="admin-recent-name">{application.applicantName}</span>
                      <StatusBadge status={application.status} adminContext />
                    </div>
                    <p className="admin-recent-meta">
                      {admissionTypeLabel(application.applicationType)} &middot; {application.courseAppliedFor}{" "}
                      &middot; Submitted {formatDate(application.submittedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </AppLayout>
  );
}
