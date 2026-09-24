import { useCallback, useEffect, useState } from "react";
import { listExamPermits, releaseExamPermit } from "../api/adminExamPermitsApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
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
  const [search, setSearch] = useState("");

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

  const filtered = search.trim()
    ? permits.filter((p) => {
        const q = search.trim().toLowerCase();
        return p.applicantName.toLowerCase().includes(q) || p.applicantEmail.toLowerCase().includes(q);
      })
    : permits;
  const pending = filtered.filter((p) => !p.isReleased);
  const released = filtered.filter((p) => p.isReleased);

  return (
    <AppLayout title="Exam Permits">
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

        {!isLoading && permits.length > 0 && (
          <input
            type="search"
            className="ui-input ui-datatable-search admin-exam-permits-search"
            placeholder="Search by applicant name or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        )}

        {isLoading ? (
          <p>Loading...</p>
        ) : permits.length === 0 ? (
          <Card>
            <p>No applicants have selected an entrance exam schedule yet.</p>
          </Card>
        ) : (
          <>
            <Card>
              <h2>Pending Release ({pending.length})</h2>
              {pending.length === 0 ? (
                <p>{search.trim() ? "No matches in Pending Release." : "Nothing waiting on release."}</p>
              ) : (
                <ul className="permit-list">
                  {pending.map((permit) => (
                    <li key={permit.userId} className="permit-row">
                      <div className="permit-row-header">
                        <div>
                          <span className="permit-applicant-name">{permit.applicantName}</span>
                          <span className="permit-applicant-email">{permit.applicantEmail}</span>
                        </div>
                        <StatusBadge
                          status={permit.documentsVerified ? "Verified" : "Pending"}
                          label={permit.documentsVerified ? "Documents Verified" : "Documents Pending"}
                        />
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
            </Card>

            <Card>
              <h2>Released ({released.length})</h2>
              {released.length === 0 ? (
                <p>{search.trim() ? "No matches in Released." : "No permits released yet."}</p>
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
            </Card>
          </>
        )}
    </AppLayout>
  );
}
