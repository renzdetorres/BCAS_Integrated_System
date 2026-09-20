import { useEffect, useState } from "react";
import { getAdminDashboard } from "../api/adminDashboardApi.js";
import { APPLICATION_TYPES } from "../api/admissionApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card, { StatCard } from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import BarChart from "../components/ui/BarChart.jsx";
import DonutChart from "../components/ui/DonutChart.jsx";
import "./AdminDashboardPage.css";

// Recent Applications is a fixed recent-N list from the API, not a filtered
// query - reordering it client-side (not re-fetching) surfaces the ones that
// still need registrar action ahead of ones already decided.
const TERMINAL_STATUSES = new Set(["Approved", "Rejected"]);

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

  const recentApplications = dashboard
    ? [...dashboard.recentApplications].sort(
        (a, b) => Number(TERMINAL_STATUSES.has(a.status)) - Number(TERMINAL_STATUSES.has(b.status))
      )
    : [];

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
            <StatCard label="Pending Action" value={dashboard.pendingCount} />
            <StatCard label="Approved" value={dashboard.approvedCount} />
            <StatCard label="Rejected" value={dashboard.rejectedCount} />
          </section>

          <div className="admin-dashboard-charts">
            <Card>
              <h2>Applicants by Program</h2>
              <BarChart
                data={dashboard.byProgram.map((entry) => ({ label: entry.program, value: entry.count }))}
                emptyMessage="No admission applications submitted yet."
              />
            </Card>

            <Card>
              <h2>Applications by Status</h2>
              <DonutChart
                centerLabel="Applications"
                segments={[
                  { label: "Approved", value: dashboard.approvedCount, color: "var(--color-status-green-text)" },
                  { label: "Pending", value: dashboard.pendingCount, color: "var(--color-accent)" },
                  { label: "Rejected", value: dashboard.rejectedCount, color: "var(--color-status-red-text)" },
                ]}
              />
            </Card>
          </div>

          <div className="admin-dashboard-recent">
            <Card>
              <h2>Recent Applications</h2>
              {recentApplications.length === 0 && <p>No admission applications submitted yet.</p>}
              {recentApplications.length > 0 && (
                <ul className="admin-recent-list">
                  {recentApplications.map((application) => (
                    <li key={application.applicationId}>
                      <div className="admin-recent-header">
                        <span className="admin-recent-name">{application.applicantName}</span>
                        <StatusBadge status={application.status} adminContext />
                      </div>
                      <p className="admin-recent-meta">
                        {admissionTypeLabel(application.applicationType)} applicant for{" "}
                        <strong>{application.courseAppliedFor}</strong>, submitted{" "}
                        {formatDate(application.submittedAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </AppLayout>
  );
}
