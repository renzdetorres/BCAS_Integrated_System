import { useCallback, useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell.jsx";
import Card from "../components/ui/Card.jsx";
import { primaryButtonClasses } from "../lib/formStyles.js";
import { listExamPermits, releaseExamPermit } from "../api/adminExamPermitsApi.js";
import { ApiError } from "../api/apiClient.js";

function formatDate(isoDate) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(isoDateTime) {
  return new Date(isoDateTime).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminExamPermitsPage() {
  const [permits, setPermits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [pendingReleaseUserId, setPendingReleaseUserId] = useState(null);
  const [releaseError, setReleaseError] = useState(null);

  const loadPermits = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listExamPermits();
      setPermits(data);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : "Failed to load exam permits.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPermits();
  }, [loadPermits]);

  async function handleRelease(permit) {
    setPendingReleaseUserId(permit.userId);
    setReleaseError(null);
    try {
      const updated = await releaseExamPermit(permit.userId);
      setPermits((prev) => prev.map((p) => (p.userId === updated.userId ? updated : p)));
    } catch (error) {
      setReleaseError(error instanceof ApiError ? error.message : "Failed to release the exam permit.");
    } finally {
      setPendingReleaseUserId(null);
    }
  }

  const pending = permits.filter((p) => !p.isReleased);
  const released = permits.filter((p) => p.isReleased);

  return (
    <AppShell>
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Exam Permits</h1>
        <p className="mt-1 text-sm text-slate-500">
          Generate and release entrance-exam permits. Release is blocked until every one of an applicant's required
          documents has been verified.
        </p>
      </div>

      {loadError && (
        <p className="mt-4 text-sm font-medium text-status-red" role="alert">
          {loadError}
        </p>
      )}
      {releaseError && (
        <p className="mt-4 text-sm font-medium text-status-red" role="alert">
          {releaseError}
        </p>
      )}

      {isLoading ? (
        <p className="mt-6 text-sm text-slate-400">Loading...</p>
      ) : permits.length === 0 ? (
        <Card className="mt-6">
          <p className="text-sm text-slate-400">No applicants have selected an entrance exam schedule yet.</p>
        </Card>
      ) : (
        <>
          <Card className="mt-6">
            <h2 className="font-bold text-slate-900">Pending Release ({pending.length})</h2>
            {pending.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">Nothing waiting on release.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {pending.map((permit) => (
                  <div key={permit.userId} className="rounded-lg border border-slate-100 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-800">{permit.applicantName}</p>
                        <p className="text-xs text-slate-400">{permit.applicantEmail}</p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          permit.documentsVerified
                            ? "bg-status-greenBg text-status-green"
                            : "bg-status-amberBg text-status-amber"
                        }`}
                      >
                        {permit.documentsVerified ? "Documents Verified" : "Documents Pending"}
                      </span>
                    </div>
                    <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                        {permit.dayType}
                      </span>
                      {formatDate(permit.examDate)} at {permit.examTime} · {permit.venue}
                    </p>
                    <button
                      type="button"
                      disabled={!permit.documentsVerified || pendingReleaseUserId === permit.userId}
                      onClick={() => handleRelease(permit)}
                      title={
                        permit.documentsVerified
                          ? undefined
                          : "All required documents must be verified before the permit can be released."
                      }
                      className={`${primaryButtonClasses} mt-3`}
                    >
                      {pendingReleaseUserId === permit.userId ? "Releasing..." : "Generate & Release Permit"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="mt-6">
            <h2 className="font-bold text-slate-900">Released ({released.length})</h2>
            {released.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">No permits released yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {released.map((permit) => (
                  <div key={permit.userId} className="rounded-lg border border-slate-100 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-800">{permit.applicantName}</p>
                        <p className="text-xs text-slate-400">{permit.applicantEmail}</p>
                      </div>
                      <span className="text-sm font-semibold text-forest">{permit.permitNumber}</span>
                    </div>
                    <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                        {permit.dayType}
                      </span>
                      {formatDate(permit.examDate)} at {permit.examTime} · {permit.venue}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">Released {formatDateTime(permit.releasedAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </AppShell>
  );
}
