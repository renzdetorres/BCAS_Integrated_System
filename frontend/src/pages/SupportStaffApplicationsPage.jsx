import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/layout/AppShell.jsx";
import Card from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { searchApplicants } from "../api/supportStaffApplicantsApi.js";
import { ApiError } from "../api/apiClient.js";

function formatDate(isoDateTime) {
  if (!isoDateTime) return "—";
  return new Date(isoDateTime).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function initialsOf(firstName, lastName) {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
}

export default function SupportStaffApplicationsPage() {
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [applicants, setApplicants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const loadApplicants = useCallback(async (activeSearch) => {
    setIsLoading(true);
    try {
      const data = await searchApplicants({ search: activeSearch });
      setApplicants(data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to load applicant records.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => loadApplicants(appliedSearch), 300);
    return () => clearTimeout(timeout);
  }, [appliedSearch, loadApplicants]);

  return (
    <AppShell>
      <h1 className="text-2xl font-extrabold text-slate-900">Applications</h1>
      <p className="mt-1 text-sm text-slate-500">
        Read-only view for document context · Status changes are Admin/Evaluator only.
      </p>

      <div className="mt-6">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setAppliedSearch(e.target.value.trim());
          }}
          placeholder="Search by name or email"
          className="w-full max-w-md rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest"
        />
      </div>

      {errorMessage && (
        <p className="mt-4 text-sm font-medium text-status-red" role="alert">
          {errorMessage}
        </p>
      )}

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-slate-400">Loading...</p>}
        {!isLoading && applicants.length === 0 && (
          <p className="text-sm text-slate-400">No applicant records match this search.</p>
        )}
        {!isLoading &&
          applicants.map((applicant) => (
            <Card key={applicant.userId}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest text-sm font-bold text-white">
                    {initialsOf(applicant.firstName, applicant.lastName)}
                  </span>
                  <div>
                    <p className="font-bold text-slate-900">
                      {applicant.firstName} {applicant.lastName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {applicant.applicationType
                        ? `${applicant.applicationType} · ${applicant.courseAppliedFor}`
                        : "No application yet"}
                      {applicant.submittedAt && ` · Submitted ${formatDate(applicant.submittedAt)}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {applicant.applicationStatus && <StatusBadge status={applicant.applicationStatus} />}
                  <Link
                    to={`/support-staff/documents?applicantId=${applicant.userId}`}
                    className="font-semibold text-forest hover:underline"
                  >
                    View Documents
                  </Link>
                </div>
              </div>
            </Card>
          ))}
      </div>
    </AppShell>
  );
}
