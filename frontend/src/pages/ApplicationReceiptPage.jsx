import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMyApplicationHistory } from "../api/applicationHistoryApi.js";
import { APPLICATION_TYPES } from "../api/admissionApi.js";
import { ApiError } from "../api/apiClient.js";
import { primaryButtonClasses } from "../lib/formStyles.js";

function formatTimestamp(isoDateTime) {
  return new Date(isoDateTime).toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function admissionTypeLabel(applicationType) {
  return APPLICATION_TYPES.find((t) => t.value === applicationType)?.label ?? applicationType;
}

export default function ApplicationReceiptPage() {
  const { applicationId } = useParams();
  const [application, setApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getMyApplicationHistory()
      .then((data) => {
        if (cancelled) return;
        setApplication(data.find((a) => a.applicationId === applicationId) ?? null);
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof ApiError ? error.message : "Failed to load your receipt.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  return (
    <main className="min-h-screen bg-page px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-xl">
        <Link
          to="/applications/history"
          className="print:hidden inline-block text-sm font-semibold text-forest hover:underline"
        >
          ← Back to My Application
        </Link>

        {isLoading && (
          <div className="mt-4 rounded-xl bg-white p-6 shadow-card">
            <p className="text-sm text-slate-400">Loading...</p>
          </div>
        )}

        {!isLoading && errorMessage && (
          <div className="mt-4 rounded-xl bg-white p-6 shadow-card">
            <p className="text-sm font-medium text-status-red" role="alert">
              {errorMessage}
            </p>
          </div>
        )}

        {!isLoading && !errorMessage && !application && (
          <div className="mt-4 rounded-xl bg-white p-6 shadow-card">
            <p className="text-sm text-slate-400">No application found with that id.</p>
          </div>
        )}

        {!isLoading && application && (
          <div className="mt-4 rounded-xl border-t-4 border-forest bg-white p-8 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-forest">
              BCAS Application Confirmation Receipt
            </p>
            <p className="mt-1 font-mono text-sm text-slate-400">{application.applicationId}</p>

            <dl className="mt-6 divide-y divide-slate-100">
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-sm text-slate-500">Category</dt>
                <dd className="text-sm font-semibold text-slate-800">{application.category}</dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-sm text-slate-500">Status</dt>
                <dd className="text-sm font-semibold text-slate-800">{application.status}</dd>
              </div>

              {application.category === "Admission" && (
                <>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-sm text-slate-500">Application type</dt>
                    <dd className="text-sm font-semibold text-slate-800">
                      {admissionTypeLabel(application.applicationType)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-sm text-slate-500">Course applied for</dt>
                    <dd className="text-sm font-semibold text-slate-800">{application.courseAppliedFor}</dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-sm text-slate-500">Previous school</dt>
                    <dd className="text-sm font-semibold text-slate-800">{application.previousSchool}</dd>
                  </div>
                </>
              )}

              {application.category === "Scholarship" && (
                <>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-sm text-slate-500">Scholarship</dt>
                    <dd className="text-sm font-semibold text-slate-800">{application.scholarshipName}</dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-sm text-slate-500">Scholarship type</dt>
                    <dd className="text-sm font-semibold text-slate-800">{application.scholarshipType}</dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-sm text-slate-500">Grade average</dt>
                    <dd className="text-sm font-semibold text-slate-800">{application.gradeAverage}</dd>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between py-2.5">
                <dt className="text-sm text-slate-500">Submitted</dt>
                <dd className="text-sm font-semibold text-slate-800">{formatTimestamp(application.submittedAt)}</dd>
              </div>
            </dl>

            <button type="button" onClick={() => window.print()} className={`${primaryButtonClasses} print:hidden mt-6`}>
              Print / Save as PDF
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
