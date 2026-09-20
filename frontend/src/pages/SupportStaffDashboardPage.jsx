import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSupportStaffDashboard } from "../api/supportStaffDashboardApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card, { StatCard } from "../components/ui/Card.jsx";
import NextActionBanner from "../components/ui/NextActionBanner.jsx";
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
        <>
          <section className="ss-stat-grid">
            <Link to="/support-staff/documents" className="ui-card ss-action-tile">
              <span className="ui-stat-card-label">Pending Verification</span>
              <span className="ui-stat-card-value">{dashboard.pendingVerificationCount}</span>
              <span className="ss-action-tile-hint">Go to verification queue</span>
            </Link>
            <Link to="/support-staff/documents" className="ui-card ss-action-tile">
              <span className="ui-stat-card-label">Flagged Documents</span>
              <span className="ui-stat-card-value">{dashboard.flaggedDocsCount}</span>
              <span className="ss-action-tile-hint">Review flagged items</span>
            </Link>
            <StatCard label="Verified Today" value={dashboard.verifiedTodayCount} />
            <Link to="/support-staff/applicants" className="ui-card ss-action-tile">
              <span className="ui-stat-card-label">Total Applicants</span>
              <span className="ui-stat-card-value">{dashboard.totalApplicants}</span>
              <span className="ss-action-tile-hint">Search applicant records</span>
            </Link>
          </section>

          {(dashboard.pendingVerificationCount > 0 || dashboard.flaggedDocsCount > 0) && (
            <NextActionBanner
              text={[
                dashboard.pendingVerificationCount > 0 &&
                  `${dashboard.pendingVerificationCount} document${
                    dashboard.pendingVerificationCount === 1 ? "" : "s"
                  } awaiting review`,
                dashboard.flaggedDocsCount > 0 &&
                  `${dashboard.flaggedDocsCount} flagged item${dashboard.flaggedDocsCount === 1 ? "" : "s"} to resolve`,
              ]
                .filter(Boolean)
                .join(" and ") + "."}
              to="/support-staff/documents"
              cta="Open Queue"
            />
          )}
        </>
      )}
    </AppLayout>
  );
}
