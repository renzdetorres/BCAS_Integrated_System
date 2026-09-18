import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listExamPermits, releaseExamPermit } from "../api/adminExamPermitsApi.js";
import { ApiError } from "../api/apiClient.js";
import "./AdminExamPermitsPage.css";

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
      setPermits((prev) => (prev.map((p) => (p.userId === updated.userId ? updated : p))));
    } catch (error) {
      setReleaseError(error instanceof ApiError ? error.message : "Failed to release the exam permit.");
    } finally {
      setPendingReleaseUserId(null);
    }
  }

  const pending = permits.filter((p) => !p.isReleased);
  const released = permits.filter((p) => p.isReleased);

  return (
    <main className="admin-exam-permits-page">
      <div className="admin-exam-permits-shell">
        <Link className="admin-exam-permits-back-link" to="/portal">
          &larr; Back to dashboard
        </Link>
        <h1>Exam Permits</h1>
        <p className="admin-exam-permits-subtitle">
          Generate and release entrance-exam permits. Release is blocked until every one of an applicant's
          required documents has been verified.
        </p>

        {loadError && (
          <p className="form-error" role="alert">
            {loadError}
          </p>
        )}
        {releaseError && (
          <p className="form-error" role="alert">
            {releaseError}
          </p>
        )}

        {isLoading ? (
          <p>Loading...</p>
        ) : permits.length === 0 ? (
          <section className="admin-exam-permits-card">
            <p>No applicants have selected an entrance exam schedule yet.</p>
          </section>
        ) : (
          <>
            <section className="admin-exam-permits-card">
              <h2>Pending Release ({pending.length})</h2>
              {pending.length === 0 ? (
                <p>Nothing waiting on release.</p>
              ) : (
                <ul className="permit-list">
                  {pending.map((permit) => (
                    <li key={permit.userId} className="permit-row">
                      <div className="permit-row-header">
                        <div>
                          <span className="permit-applicant-name">{permit.applicantName}</span>
                          <span className="permit-applicant-email">{permit.applicantEmail}</span>
                        </div>
                        <span
                          className={`docs-badge ${permit.documentsVerified ? "docs-verified" : "docs-pending"}`}
                        >
                          {permit.documentsVerified ? "Documents Verified" : "Documents Pending"}
                        </span>
                      </div>
                      <p className="permit-schedule">
                        <span className={`daytype-badge daytype-${permit.dayType.toLowerCase()}`}>
                          {permit.dayType}
                        </span>
                        {formatDate(permit.examDate)} at {permit.examTime} &middot; {permit.venue}
                      </p>
                      <button
                        type="button"
                        className="release-button"
                        disabled={!permit.documentsVerified || pendingReleaseUserId === permit.userId}
                        onClick={() => handleRelease(permit)}
                        title={
                          permit.documentsVerified
                            ? undefined
                            : "All required documents must be verified before the permit can be released."
                        }
                      >
                        {pendingReleaseUserId === permit.userId ? "Releasing..." : "Generate & Release Permit"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="admin-exam-permits-card">
              <h2>Released ({released.length})</h2>
              {released.length === 0 ? (
                <p>No permits released yet.</p>
              ) : (
                <ul className="permit-list">
                  {released.map((permit) => (
                    <li key={permit.userId} className="permit-row">
                      <div className="permit-row-header">
                        <div>
                          <span className="permit-applicant-name">{permit.applicantName}</span>
                          <span className="permit-applicant-email">{permit.applicantEmail}</span>
                        </div>
                        <span className="permit-number">{permit.permitNumber}</span>
                      </div>
                      <p className="permit-schedule">
                        <span className={`daytype-badge daytype-${permit.dayType.toLowerCase()}`}>
                          {permit.dayType}
                        </span>
                        {formatDate(permit.examDate)} at {permit.examTime} &middot; {permit.venue}
                      </p>
                      <p className="permit-released-at">Released {formatDateTime(permit.releasedAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
