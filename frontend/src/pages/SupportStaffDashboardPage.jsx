import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileSearch, CheckCircle2, AlertTriangle, Users, ChevronRight } from "lucide-react";
import AppShell from "../components/layout/AppShell.jsx";
import Card from "../components/ui/Card.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import { getSupportStaffDashboard } from "../api/supportStaffDashboardApi.js";
import { ApiError } from "../api/apiClient.js";

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
    <AppShell badges={{ documents: dashboard?.pendingVerificationCount || undefined }}>
      <h1 className="text-2xl font-extrabold text-slate-900">Support Staff Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">Document verification and applicant record management.</p>

      {isLoading && <p className="mt-6 text-sm text-slate-400">Loading...</p>}
      {errorMessage && (
        <p className="mt-6 text-sm font-medium text-status-red" role="alert">
          {errorMessage}
        </p>
      )}

      {!isLoading && !errorMessage && dashboard && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={FileSearch} label="Pending Verification" value={dashboard.pendingVerificationCount} />
            <StatCard icon={CheckCircle2} label="Verified Today" value={dashboard.verifiedTodayCount} />
            <StatCard icon={AlertTriangle} label="Flagged Docs" value={dashboard.flaggedDocsCount} />
            <StatCard icon={Users} label="Total Applicants" value={dashboard.totalApplicants} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Link to="/support/applications">
              <Card className="flex h-full items-center justify-between transition-shadow hover:shadow-lg">
                <div>
                  <p className="font-bold text-slate-900">Applicant Records</p>
                  <p className="text-sm text-slate-500">Browse and look up applicant information →</p>
                </div>
                <ChevronRight size={18} className="text-slate-300" />
              </Card>
            </Link>
            <Link to="/support/documents">
              <Card className="flex h-full items-center justify-between transition-shadow hover:shadow-lg">
                <div>
                  <p className="font-bold text-slate-900">Document Verification</p>
                  <p className="text-sm text-slate-500">
                    {dashboard.pendingVerificationCount} documents awaiting verification →
                  </p>
                </div>
                <ChevronRight size={18} className="text-slate-300" />
              </Card>
            </Link>
          </div>
        </>
      )}
    </AppShell>
  );
}
