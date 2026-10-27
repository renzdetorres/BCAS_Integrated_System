import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSupportStaffDashboard } from "../api/supportStaffDashboardApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import NextActionBanner from "../components/ui/NextActionBanner.jsx";
import "./SupportStaffDashboardPage.css";
import Skeleton from "../components/ui/Skeleton.jsx";

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
          <Skeleton variant="dashboard" />
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
            <Link to="/support-staff/payments" className="ui-card ss-action-tile">
              <span className="ui-stat-card-label">Payments to Verify</span>
              <span className="ui-stat-card-value">{dashboard.pendingPaymentsCount}</span>
              <span className="ss-action-tile-hint">Go to payment verification</span>
            </Link>
            <Link to="/support-staff/payments" className="ui-card ss-action-tile">
              <span className="ui-stat-card-label">Rejected Payments</span>
              <span className="ui-stat-card-value">{dashboard.rejectedPaymentsCount}</span>
              <span className="ss-action-tile-hint">Waiting for a new proof</span>
            </Link>
            <div className="ui-card ss-action-tile ss-action-tile-static">
              <span className="ui-stat-card-label">Verified Today</span>
              <span className="ui-stat-card-value">{dashboard.verifiedPaymentsTodayCount}</span>
              <span className="ss-action-tile-hint ss-action-tile-hint-muted">Payments verified today</span>
            </div>
            <Link to="/support-staff/applicants" className="ui-card ss-action-tile">
              <span className="ui-stat-card-label">Total Applicants</span>
              <span className="ui-stat-card-value">{dashboard.totalApplicants}</span>
              <span className="ss-action-tile-hint">Search applicant records</span>
            </Link>
          </section>

          {dashboard.pendingPaymentsCount > 0 && (
            <NextActionBanner
              text={`${dashboard.pendingPaymentsCount} payment${dashboard.pendingPaymentsCount === 1 ? "" : "s"} waiting to be verified.`}
              to="/support-staff/payments"
              cta="Verify Payments"
            />
          )}
        </>
      )}
    </AppLayout>
  );
}
