import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, CheckCircle2, XCircle, Users, ChevronRight } from "lucide-react";
import AppShell from "../components/layout/AppShell.jsx";
import Card from "../components/ui/Card.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { getApplicationsReadyForDecision } from "../api/academicHeadScholarshipApplicationsApi.js";
import { getAdminDashboard } from "../api/adminDashboardApi.js";
import { ApiError } from "../api/apiClient.js";

function formatDate(isoDateTime) {
  return new Date(isoDateTime).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function AcademicHeadDashboardPage() {
  const [queue, setQueue] = useState([]);
  const [oversight, setOversight] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getApplicationsReadyForDecision(), getAdminDashboard()])
      .then(([queueData, oversightData]) => {
        if (cancelled) return;
        setQueue(queueData);
        setOversight(oversightData);
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
    <AppShell badges={{ review: queue.length || undefined }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Academic Head Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Scholarship oversight &amp; department reporting — SY 2025-2026</p>
        </div>
      </div>

      {isLoading && <p className="mt-6 text-sm text-slate-400">Loading...</p>}
      {errorMessage && (
        <p className="mt-6 text-sm font-medium text-status-red" role="alert">
          {errorMessage}
        </p>
      )}

      {!isLoading && !errorMessage && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={ClipboardList} label="Awaiting Decision" value={queue.length} />
            <StatCard icon={Users} label="Total Applications" value={oversight?.totalApplications ?? "—"} />
            <StatCard icon={CheckCircle2} label="Approved" value={oversight?.approvedCount ?? "—"} />
            <StatCard icon={XCircle} label="Rejected" value={oversight?.rejectedCount ?? "—"} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Link to="/academic-head/scholarships">
              <Card className="flex h-full items-center justify-between transition-shadow hover:shadow-lg">
                <div>
                  <p className="font-bold text-slate-900">Scholarship Slots</p>
                  <p className="text-sm text-slate-500">Manage slot capacity →</p>
                </div>
                <ChevronRight size={18} className="text-slate-300" />
              </Card>
            </Link>
            <Link to="/academic-head/announcements">
              <Card className="flex h-full items-center justify-between transition-shadow hover:shadow-lg">
                <div>
                  <p className="font-bold text-slate-900">Announcements</p>
                  <p className="text-sm text-slate-500">Post &amp; manage notices →</p>
                </div>
                <ChevronRight size={18} className="text-slate-300" />
              </Card>
            </Link>
            <Link to="/academic-head/reports">
              <Card className="flex h-full items-center justify-between transition-shadow hover:shadow-lg">
                <div>
                  <p className="font-bold text-slate-900">Reports</p>
                  <p className="text-sm text-slate-500">Admission &amp; scholarship data →</p>
                </div>
                <ChevronRight size={18} className="text-slate-300" />
              </Card>
            </Link>
          </div>

          <Card className="mt-6">
            <h2 className="font-bold text-slate-900">Applications Awaiting Decision</h2>
            <div className="mt-4 overflow-x-auto">
              {queue.length === 0 ? (
                <p className="text-sm text-slate-400">No scholarship applications are waiting on a final decision.</p>
              ) : (
                <table className="w-full min-w-max border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2">Applicant</th>
                      <th className="px-3 py-2">Scholarship</th>
                      <th className="px-3 py-2">GWA</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Submitted</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {queue.map((application) => (
                      <tr key={application.applicationId} className="border-b border-slate-50 last:border-0">
                        <td className="px-3 py-3 font-medium text-slate-800">{application.applicantName}</td>
                        <td className="px-3 py-3 text-slate-500">
                          {application.scholarshipName} · {application.scholarshipType}
                        </td>
                        <td className="px-3 py-3 text-slate-500">{application.gradeAverage}</td>
                        <td className="px-3 py-3">
                          <StatusBadge status={application.status} />
                        </td>
                        <td className="px-3 py-3 text-slate-500">{formatDate(application.submittedAt)}</td>
                        <td className="px-3 py-3">
                          <Link
                            to={`/academic-head/scholarship-applications/${application.applicationId}`}
                            className="font-semibold text-forest hover:underline"
                          >
                            Review
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
