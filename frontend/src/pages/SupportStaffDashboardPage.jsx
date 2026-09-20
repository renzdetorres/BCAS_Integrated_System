import { useEffect, useState } from "react";
import { getSupportStaffDashboard } from "../api/supportStaffDashboardApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card, { StatCard } from "../components/ui/Card.jsx";
import "./SupportStaffDashboardPage.css";

export default function SupportStaffDashboardPage() {
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
    <AppLayout title="Support Staff Dashboard">
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
        <section className="ss-stat-grid">
          <StatCard label="Pending Verification" value={dashboard.pendingVerificationCount} />
          <StatCard label="Verified Today" value={dashboard.verifiedTodayCount} />
          <StatCard label="Flagged Documents" value={dashboard.flaggedDocsCount} />
          <StatCard label="Total Applicants" value={dashboard.totalApplicants} />
        </section>
      )}
    </AppLayout>
  );
}
