import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/layout/AppShell.jsx";
import Card from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { getMyApplicationHistory } from "../api/applicationHistoryApi.js";
import { APPLICATION_TYPES } from "../api/admissionApi.js";
import { ApiError } from "../api/apiClient.js";

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function admissionTypeLabel(applicationType) {
  return APPLICATION_TYPES.find((t) => t.value === applicationType)?.label ?? applicationType;
}

function applicationTitle(application) {
  return application.category === "Admission" ? application.courseAppliedFor : application.scholarshipName;
}

export default function MyApplicationHistoryPage() {
  const [applications, setApplications] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getMyApplicationHistory()
      .then((data) => {
        if (cancelled) return;
        setApplications(data);
        if (data.length > 0) setSelectedId(data[0].applicationId);
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof ApiError ? error.message : "Failed to load application history.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedApplication = applications.find((a) => a.applicationId === selectedId) ?? null;

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold text-slate-900">My Application</h1>
        <Link
          to="/app/my-application"
          className="inline-flex items-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest-dark"
        >
          Submit New Application
        </Link>
      </div>

      {errorMessage && (
        <p className="mt-4 text-sm font-medium text-status-red" role="alert">
          {errorMessage}
        </p>
      )}

      {isLoading && <p className="mt-6 text-sm text-slate-400">Loading...</p>}

      {!isLoading && !errorMessage && applications.length === 0 && (
        <Card className="mt-6">
          <p className="text-sm text-slate-400">No applications submitted yet.</p>
        </Card>
      )}

      {!isLoading && applications.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_2fr]">
          <Card>
            <h2 className="font-bold text-slate-900">All Applications</h2>
            <ul className="mt-4 space-y-2">
              {applications.map((application) => (
                <li key={application.applicationId}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(application.applicationId)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      application.applicationId === selectedId
                        ? "border-forest bg-forest/5"
                        : "border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                        {application.category}
                      </span>
                      <StatusBadge status={application.status} />
                    </div>
                    <p className="mt-1.5 font-semibold text-slate-800">{applicationTitle(application)}</p>
                    <p className="text-xs text-slate-400">Submitted {formatDate(application.submittedAt)}</p>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h2 className="font-bold text-slate-900">Application Details</h2>
            {!selectedApplication && <p className="mt-2 text-sm text-slate-400">Select an application to see its details.</p>}
            {selectedApplication && (
              <div className="mt-4">
                <Link
                  to={`/applications/receipt/${selectedApplication.applicationId}`}
                  className="text-sm font-semibold text-forest hover:underline"
                >
                  View / Print Receipt →
                </Link>

                <dl className="mt-4 divide-y divide-slate-100">
                  <div className="flex items-center justify-between py-2">
                    <dt className="text-sm text-slate-500">Category</dt>
                    <dd className="text-sm font-medium text-slate-800">{selectedApplication.category}</dd>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <dt className="text-sm text-slate-500">Status</dt>
                    <dd>
                      <StatusBadge status={selectedApplication.status} />
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <dt className="text-sm text-slate-500">Submitted</dt>
                    <dd className="text-sm font-medium text-slate-800">{formatDate(selectedApplication.submittedAt)}</dd>
                  </div>

                  {selectedApplication.category === "Admission" && (
                    <>
                      <div className="flex items-center justify-between py-2">
                        <dt className="text-sm text-slate-500">Application type</dt>
                        <dd className="text-sm font-medium text-slate-800">
                          {admissionTypeLabel(selectedApplication.applicationType)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <dt className="text-sm text-slate-500">Course applied for</dt>
                        <dd className="text-sm font-medium text-slate-800">{selectedApplication.courseAppliedFor}</dd>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <dt className="text-sm text-slate-500">Previous school</dt>
                        <dd className="text-sm font-medium text-slate-800">{selectedApplication.previousSchool}</dd>
                      </div>
                    </>
                  )}

                  {selectedApplication.category === "Scholarship" && (
                    <>
                      <div className="flex items-center justify-between py-2">
                        <dt className="text-sm text-slate-500">Scholarship</dt>
                        <dd className="text-sm font-medium text-slate-800">{selectedApplication.scholarshipName}</dd>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <dt className="text-sm text-slate-500">Scholarship type</dt>
                        <dd className="text-sm font-medium text-slate-800">{selectedApplication.scholarshipType}</dd>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <dt className="text-sm text-slate-500">Grade average</dt>
                        <dd className="text-sm font-medium text-slate-800">{selectedApplication.gradeAverage}</dd>
                      </div>
                    </>
                  )}
                </dl>
              </div>
            )}
          </Card>
        </div>
      )}
    </AppShell>
  );
}
