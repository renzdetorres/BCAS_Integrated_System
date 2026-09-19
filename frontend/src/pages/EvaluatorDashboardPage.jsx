import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ListChecks, CheckCircle2, XCircle, ClipboardCheck, ChevronRight } from "lucide-react";
import AppShell from "../components/layout/AppShell.jsx";
import Card from "../components/ui/Card.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { getEvaluatorDashboard } from "../api/evaluatorDashboardApi.js";
import { ApiError } from "../api/apiClient.js";

function formatDate(isoDateTime) {
  return new Date(isoDateTime).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function EvaluatorDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getEvaluatorDashboard()
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
    <AppShell badges={{ screening: dashboard?.pendingEvaluationsCount || undefined }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Evaluator Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Scholarship eligibility screening — SY 2025-2026</p>
        </div>
        <Link
          to="/evaluator/screening"
          className="inline-flex items-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest-dark"
        >
          Open Queue
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
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={ListChecks} label="In Queue" value={dashboard.pendingEvaluationsCount} />
            <StatCard icon={ClipboardCheck} label="Screened Today" value={dashboard.recentlyEvaluated.length} />
            <StatCard icon={CheckCircle2} label="Eligible" value="—" />
            <StatCard icon={XCircle} label="Not Eligible" value="—" />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Link to="/evaluator/screening">
              <Card className="flex h-full items-center justify-between transition-shadow hover:shadow-lg">
                <div>
                  <p className="font-bold text-slate-900">Scholarship Queue</p>
                  <p className="text-sm text-slate-500">
                    {dashboard.pendingEvaluationsCount} applications pending review →
                  </p>
                </div>
                <ChevronRight size={18} className="text-slate-300" />
              </Card>
            </Link>
            <Link to={dashboard.queue[0] ? `/evaluator/scholarship-applications/${dashboard.queue[0].applicationId}` : "#"}>
              <Card className="flex h-full items-center justify-between transition-shadow hover:shadow-lg">
                <div>
                  <p className="font-bold text-slate-900">Eligibility Screening</p>
                  <p className="text-sm text-slate-500">Evaluate current applicant →</p>
                </div>
                <ChevronRight size={18} className="text-slate-300" />
              </Card>
            </Link>
          </div>

          <Card className="mt-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Recently Screened</h2>
              <Link to="/evaluator/scholarship-applications" className="text-sm font-semibold text-forest hover:underline">
                View All →
              </Link>
            </div>
            <div className="mt-4 overflow-x-auto">
              {dashboard.recentlyEvaluated.length === 0 ? (
                <p className="text-sm text-slate-400">No scholarship applications evaluated yet.</p>
              ) : (
                <table className="w-full min-w-max border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2">Applicant</th>
                      <th className="px-3 py-2">Ref. No.</th>
                      <th className="px-3 py-2">Program</th>
                      <th className="px-3 py-2">GWA</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.recentlyEvaluated.map((application) => (
                      <tr key={application.applicationId} className="border-b border-slate-50 last:border-0">
                        <td className="px-3 py-3 font-medium text-slate-800">{application.applicantName}</td>
                        <td className="px-3 py-3 text-slate-500">
                          {application.applicationId.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="px-3 py-3 text-slate-500">{application.scholarshipName}</td>
                        <td className="px-3 py-3 text-slate-500">{application.gradeAverage}</td>
                        <td className="px-3 py-3">
                          <StatusBadge status={application.status} />
                        </td>
                        <td className="px-3 py-3">
                          <Link
                            to={`/evaluator/scholarship-applications/${application.applicationId}`}
                            className="font-semibold text-forest hover:underline"
                          >
                            View
                          </Link>
                        </td>
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
