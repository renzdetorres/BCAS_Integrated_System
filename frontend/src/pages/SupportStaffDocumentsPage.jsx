import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  listDocumentsForApplicant,
  listPendingAndFlaggedDocuments,
  reviewDocument,
} from "../api/supportStaffDocumentsApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import "./SupportStaffDocumentsPage.css";

function formatDateTime(isoDateTime) {
  return new Date(isoDateTime).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const REVIEWABLE_STATUSES = new Set(["Pending", "Flagged"]);

export default function SupportStaffDocumentsPage() {
  const [searchParams] = useSearchParams();
  const applicantId = searchParams.get("applicantId");

  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const [pendingActionId, setPendingActionId] = useState(null);
  const [reasonPromptId, setReasonPromptId] = useState(null);
  const [reasonAction, setReasonAction] = useState(null);
  const [reasonText, setReasonText] = useState("");
  const [reasonError, setReasonError] = useState(null);

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = applicantId
        ? await listDocumentsForApplicant(applicantId)
        : await listPendingAndFlaggedDocuments();
      setDocuments(data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to load documents.");
    } finally {
      setIsLoading(false);
    }
  }, [applicantId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  function startReasonPrompt(documentId, action) {
    setReasonPromptId(documentId);
    setReasonAction(action);
    setReasonText("");
    setReasonError(null);
  }

  function cancelReasonPrompt() {
    setReasonPromptId(null);
    setReasonAction(null);
    setReasonText("");
    setReasonError(null);
  }

  async function handleApprove(documentId) {
    setPendingActionId(documentId);
    setErrorMessage(null);
    try {
      await reviewDocument(documentId, { status: "Verified" });
      await loadDocuments();
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to approve the document.");
    } finally {
      setPendingActionId(null);
    }
  }

  async function handleReasonSubmit(documentId) {
    if (reasonText.trim().length === 0) {
      setReasonError("A reason is required.");
      return;
    }

    setPendingActionId(documentId);
    setReasonError(null);
    try {
      await reviewDocument(documentId, { status: reasonAction, reason: reasonText.trim() });
      cancelReasonPrompt();
      await loadDocuments();
    } catch (error) {
      setReasonError(error instanceof ApiError ? error.message : "Failed to submit the review.");
    } finally {
      setPendingActionId(null);
    }
  }

  const applicantName = documents[0]?.applicantName;

  return (
    <AppLayout title="Document Verification">
        {applicantId ? (
          <p className="ss-documents-subtitle">
            {applicantName ? (
              <>
                Showing every document for <strong>{applicantName}</strong>, any status.
              </>
            ) : (
              "Showing every document for this applicant, any status."
            )}{" "}
            <Link className="ss-documents-queue-link" to="/support-staff/documents">
              View the full verification queue
            </Link>
            {" instead."}
          </p>
        ) : (
          <p className="ss-documents-subtitle">
            Documents awaiting review or currently flagged. Rejecting or flagging a document requires a reason; the
            applicant can re-upload a corrected document afterward.{" "}
            <Link className="ss-documents-queue-link" to="/support-staff/documents/archive">
              View the document archive
            </Link>
            .
          </p>
        )}

        <Card>
          {errorMessage && (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          )}

          {isLoading ? (
            <p>Loading...</p>
          ) : documents.length === 0 ? (
            <p>
              {applicantId
                ? "This applicant hasn't uploaded any documents yet."
                : "No documents are awaiting review or flagged right now."}
            </p>
          ) : (
            <table className="ss-documents-table">
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Document Type</th>
                  <th>Status</th>
                  <th>Uploaded</th>
                  <th aria-hidden="true"></th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <tr key={document.documentId}>
                    <td>
                      <span className="ss-documents-name">{document.applicantName}</span>
                      <span className="ss-documents-email">{document.applicantEmail}</span>
                    </td>
                    <td>{document.documentType}</td>
                    <td>
                      <StatusBadge status={document.status} />
                      {document.flaggedReason && (
                        <span className="ss-documents-reason">Reason: {document.flaggedReason}</span>
                      )}
                      {document.reviewedByName && (
                        <span className="ss-documents-reviewed-by">
                          Last reviewed by {document.reviewedByName} on {formatDateTime(document.reviewedAt)}
                        </span>
                      )}
                    </td>
                    <td>{formatDateTime(document.uploadedAt)}</td>
                    <td className="ss-documents-actions-cell">
                      {!REVIEWABLE_STATUSES.has(document.status) ? null : reasonPromptId === document.documentId ? (
                        <div className="ss-documents-reason-form">
                          <textarea
                            rows={2}
                            placeholder={`Reason for ${reasonAction === "Rejected" ? "rejecting" : "flagging"} this document`}
                            value={reasonText}
                            onChange={(event) => setReasonText(event.target.value)}
                          />
                          {reasonError && (
                            <p className="form-error ss-documents-reason-error" role="alert">
                              {reasonError}
                            </p>
                          )}
                          <div className="row-actions">
                            <button
                              type="button"
                              className="reason-submit"
                              onClick={() => handleReasonSubmit(document.documentId)}
                              disabled={pendingActionId === document.documentId}
                            >
                              {pendingActionId === document.documentId ? "Submitting..." : `Confirm ${reasonAction}`}
                            </button>
                            <button
                              type="button"
                              className="reason-cancel"
                              onClick={cancelReasonPrompt}
                              disabled={pendingActionId === document.documentId}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="row-actions">
                          <button
                            type="button"
                            className="action-approve"
                            onClick={() => handleApprove(document.documentId)}
                            disabled={pendingActionId === document.documentId}
                          >
                            {pendingActionId === document.documentId ? "Saving..." : "Approve"}
                          </button>
                          <button
                            type="button"
                            className="action-reject"
                            onClick={() => startReasonPrompt(document.documentId, "Rejected")}
                            disabled={pendingActionId === document.documentId}
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            className="action-flag"
                            onClick={() => startReasonPrompt(document.documentId, "Flagged")}
                            disabled={pendingActionId === document.documentId}
                          >
                            Flag
                          </button>
                        </div>
                      )}
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
