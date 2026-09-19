import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Clock, CheckCircle2, XCircle, BarChart3 } from "lucide-react";
import AppShell from "../components/layout/AppShell.jsx";
import Card from "../components/ui/Card.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import BarChart from "../components/ui/BarChart.jsx";
import DonutChart from "../components/ui/DonutChart.jsx";
import { getAdminDashboard } from "../api/adminDashboardApi.js";
import { APPLICATION_TYPES } from "../api/admissionApi.js";
import { ApiError } from "../api/apiClient.js";

function formatDate(isoDateTime) {
  return new Date(isoDateTime).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
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
    <AppShell badges={{ applications: dashboard?.pendingCount || undefined }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Overview</h1>
          <p className="mt-1 text-sm text-slate-500">Admissions and Scholarship — SY 2025-2026</p>
        </div>
        <Link
          to="/admin/reports"
          className="inline-flex items-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest-dark"
        >
          <BarChart3 size={16} />
          Generate Report
        </Link>
      </div>

      {isLoading && <p className="mt-6 text-sm text-slate-400">Loading...</p>}
      {errorMessage && (
        <p className="mt-6 text-sm font-medium text-status-red" role="alert">
          {errorMessage}
        </p>
      )}

      {!isLoading && !errorMessage && dashboard && (
        <>
          <div className="mt-6 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Admissions Overview</h2>
            <Link to="/admin/applications" className="text-sm font-semibold text-forest hover:underline">
              View All →
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Users} label="Total Applicants" value={dashboard.totalApplicants} />
            <StatCard icon={Clock} label="Pending Review" value={dashboard.pendingCount} />
            <StatCard icon={CheckCircle2} label="Approved" value={dashboard.approvedCount} />
            <StatCard icon={XCircle} label="Rejected" value={dashboard.rejectedCount} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <h3 className="font-bold text-slate-900">By Program Level</h3>
              <div className="mt-4">
                {dashboard.byProgram.length === 0 ? (
                  <p className="text-sm text-slate-400">No admission applications submitted yet.</p>
                ) : (
                  <BarChart data={dashboard.byProgram.map((p) => ({ label: p.program, count: p.count }))} />
                )}
              </div>
            </Card>

            <Card>
              <h3 className="font-bold text-slate-900">Status Distribution</h3>
              <div className="mt-4">
                <DonutChart
                  data={[
                    { label: "Pending", value: dashboard.pendingCount, color: "amber" },
                    { label: "Approved", value: dashboard.approvedCount, color: "green" },
                    { label: "Rejected", value: dashboard.rejectedCount, color: "red" },
                  ]}
                />
              </div>
            </Card>
          </div>

          <Card className="mt-6">
            <h3 className="font-bold text-slate-900">Recent Admission Applications</h3>
            <div className="mt-4 overflow-x-auto">
              {dashboard.recentApplications.length === 0 ? (
                <p className="text-sm text-slate-400">No admission applications submitted yet.</p>
              ) : (
                <table className="w-full min-w-max border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2">Applicant</th>
                      <th className="px-3 py-2">App. No</th>
                      <th className="px-3 py-2">Level</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.recentApplications.map((application) => (
                      <tr key={application.applicationId} className="border-b border-slate-50 last:border-0">
                        <td className="px-3 py-3 font-medium text-slate-800">{application.applicantName}</td>
                        <td className="px-3 py-3 text-slate-500">
                          {application.applicationId.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="px-3 py-3 text-slate-500">
                          {admissionTypeLabel(application.applicationType)} · {application.courseAppliedFor}
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge status={application.status} />
                        </td>
                        <td className="px-3 py-3 text-slate-500">{formatDate(application.submittedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </>
      )}
    </AppShell>
  );
}
