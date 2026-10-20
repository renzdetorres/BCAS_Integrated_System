import { useCallback, useEffect, useState } from "react";
import { getOpenDuplicateFlags, resolveDuplicateFlag } from "../api/duplicateApplicantsApi.js";
import { ApiError } from "../api/apiClient.js";
import { useToast } from "../context/ToastContext.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import "./AdminDuplicateApplicantsPage.css";

function formatDateTime(isoDateTime) {
  return new Date(isoDateTime).toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminDuplicateApplicantsPage() {
  const { showToast } = useToast();
  const [flags, setFlags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [pendingFlagId, setPendingFlagId] = useState(null);

  const loadFlags = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getOpenDuplicateFlags();
      setFlags(data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to load duplicate-applicant flags.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFlags();
  }, [loadFlags]);

  async function handleResolve(flag, status) {
    setPendingFlagId(flag.flagId);
    setErrorMessage(null);
    try {
      await resolveDuplicateFlag(flag.flagId, { status });
      setFlags((prev) => prev.filter((f) => f.flagId !== flag.flagId));
      showToast(status === "Dismissed" ? "Flag dismissed - not a duplicate." : "Marked as a confirmed duplicate.");
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to resolve this flag.");
    } finally {
      setPendingFlagId(null);
    }
  }

  return (
    <AppLayout title="Duplicate Applicants">
      <Card>
        <p className="duplicate-applicants-subtitle">
          A close name match against an existing applicant account was found at registration. This never blocks
          registration or merges anything automatically - review each one and either dismiss it (a coincidental
          name match, not the same person) or confirm it as a duplicate to follow up on manually.
        </p>

        {errorMessage && (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        )}

        {isLoading ? (
          <p>Loading...</p>
        ) : flags.length === 0 ? (
          <p>No potential duplicates awaiting review.</p>
        ) : (
          <table className="duplicate-applicants-table">
            <thead>
              <tr>
                <th>New Registration</th>
                <th>Matches Existing Account</th>
                <th>Detected</th>
                <th aria-hidden="true"></th>
              </tr>
            </thead>
            <tbody>
              {flags.map((flag) => (
                <tr key={flag.flagId}>
                  <td>
                    <div className="duplicate-applicant-name">{flag.newUserName}</div>
                    <div className="duplicate-applicant-email">{flag.newUserEmail}</div>
                  </td>
                  <td>
                    <div className="duplicate-applicant-name">{flag.matchedUserName}</div>
                    <div className="duplicate-applicant-email">{flag.matchedUserEmail}</div>
                  </td>
                  <td>{formatDateTime(flag.detectedAt)}</td>
                  <td className="row-actions">
                    <button
                      type="button"
                      className="duplicate-dismiss"
                      onClick={() => handleResolve(flag, "Dismissed")}
                      disabled={pendingFlagId === flag.flagId}
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      className="duplicate-confirm"
                      onClick={() => handleResolve(flag, "ConfirmedDuplicate")}
                      disabled={pendingFlagId === flag.flagId}
                    >
                      Confirm Duplicate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </AppLayout>
  );
}
