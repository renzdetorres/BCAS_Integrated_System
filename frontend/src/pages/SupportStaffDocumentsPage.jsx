import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, AlertTriangle, Clock, XCircle } from "lucide-react";
import AppShell from "../components/layout/AppShell.jsx";
import Card from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import Modal from "../components/ui/Modal.jsx";
import { inputClasses, primaryButtonClasses } from "../lib/formStyles.js";
import {
  listDocumentsForApplicant,
  listPendingAndFlaggedDocuments,
  reviewDocument,
} from "../api/supportStaffDocumentsApi.js";
import { ApiError } from "../api/apiClient.js";

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

const STATUS_ICON = {
  Pending: { Icon: Clock, className: "bg-status-amberBg text-[#9C6B12]" },
  Verified: { Icon: CheckCircle2, className: "bg-status-greenBg text-status-green" },
  Flagged: { Icon: AlertTriangle, className: "bg-status-redBg text-status-red" },
  Rejected: { Icon: XCircle, className: "bg-status-redBg text-status-red" },
};

const TABS = ["All", "Pending", "Verified", "Flagged"];

export default function SupportStaffDocumentsPage() {
  const [searchParams] = useSearchParams();
  const applicantId = searchParams.get("applicantId");

  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [tab, setTab] = useState("All");

  const [pendingActionId, setPendingActionId] = useState(null);
  const [reasonPrompt, setReasonPrompt] = useState(null); // { documentId, action }
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

  async function handleReasonSubmit() {
    if (reasonText.trim().length === 0) {
      setReasonError("A reason is required.");
      return;
    }

    setPendingActionId(reasonPrompt.documentId);
    setReasonError(null);
    try {
      await reviewDocument(reasonPrompt.documentId, { status: reasonPrompt.action, reason: reasonText.trim() });
      setReasonPrompt(null);
      setReasonText("");
      await loadDocuments();
    } catch (error) {
      setReasonError(error instanceof ApiError ? error.message : "Failed to submit the review.");
    } finally {
      setPendingActionId(null);
    }
  }

  const counts = {
    All: documents.length,
    Pending: documents.filter((d) => d.status === "Pending").length,
    Verified: documents.filter((d) => d.status === "Verified").length,
    Flagged: documents.filter((d) => d.status === "Flagged" || d.status === "Rejected").length,
  };

  const rows = documents.filter((d) => {
    if (tab === "All") return true;
    if (tab === "Flagged") return d.status === "Flagged" || d.status === "Rejected";
    return d.status === tab;
  });

  const applicantName = documents[0]?.applicantName;

  return (
    <AppShell badges={{ documents: counts.Pending || undefined }}>
      <h1 className="text-2xl font-extrabold text-slate-900">Document Verification</h1>
      {applicantId ? (
        <p className="mt-1 text-sm text-slate-500">
          {applicantName ? <>Showing every document for <strong>{applicantName}</strong>.</> : "Showing every document for this applicant."}{" "}
          <Link to="/support-staff/documents" className="font-semibold text-forest hover:underline">
            View full queue
          </Link>
        </p>
      ) : (
        <p className="mt-1 text-sm text-slate-500">
          {counts.Pending} pending · {counts.Flagged} flagged.{" "}
          <Link to="/support-staff/documents/archive" className="font-semibold text-forest hover:underline">
            View archive
          </Link>
        </p>
      )}

      {!applicantId && (
        <div className="mt-6 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                tab === t ? "bg-forest text-white" : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t} ({counts[t]})
            </button>
          ))}
        </div>
      )}

      {errorMessage && (
        <p className="mt-4 text-sm font-medium text-status-red" role="alert">
          {errorMessage}
        </p>
      )}

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-slate-400">Loading...</p>}
        {!isLoading && rows.length === 0 && (
          <p className="text-sm text-slate-400">
            {applicantId ? "This applicant hasn't uploaded any documents yet." : "No documents match this filter."}
          </p>
        )}
        {!isLoading &&
          rows.map((doc) => {
            const { Icon, className } = STATUS_ICON[doc.status] ?? STATUS_ICON.Pending;
            const isReviewable = REVIEWABLE_STATUSES.has(doc.status);
            return (
              <Card key={doc.documentId}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${className}`}>
                      <Icon size={20} />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900">{doc.documentType}</p>
                        <StatusBadge status={doc.status} />
                      </div>
                      <p className="text-xs text-slate-400">
                        {doc.applicantName} · {doc.applicantEmail}
                      </p>
                      <span className="text-sm text-status-blue underline">{doc.fileName}</span>
                    </div>
                  </div>

                  {isReviewable &&
                    (doc.status === "Verified" ? (
                      <button
                        type="button"
                        onClick={() => setReasonPrompt({ documentId: doc.documentId, action: "Flagged" })}
                        className="text-sm font-semibold text-status-red hover:underline"
                      >
                        Flag as issue
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleApprove(doc.documentId)}
                          disabled={pendingActionId === doc.documentId}
                          className="rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-dark disabled:opacity-50"
                        >
                          {pendingActionId === doc.documentId ? "Saving..." : "✓ Mark Verified"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setReasonPrompt({ documentId: doc.documentId, action: "Flagged" })}
                          disabled={pendingActionId === doc.documentId}
                          className="rounded-lg border border-status-red px-4 py-2 text-sm font-semibold text-status-red hover:bg-status-redBg disabled:opacity-50"
                        >
                          ⚠ Flag Issue
                        </button>
                      </div>
                    ))}
                </div>

                {(doc.status === "Flagged" || doc.status === "Rejected") && doc.flaggedReason && (
                  <p className="mt-3 rounded-lg bg-status-redBg px-3 py-2 text-sm text-status-red">
                    ⚠ {doc.flaggedReason}
                  </p>
                )}
                {doc.reviewedByName && (
                  <p className="mt-2 text-xs text-slate-400">
                    Last reviewed by {doc.reviewedByName} on {formatDateTime(doc.reviewedAt)}
                  </p>
                )}
              </Card>
            );
          })}
      </div>

      {reasonPrompt && (
        <Modal title="Flag Document" onClose={() => setReasonPrompt(null)}>
          <textarea
            rows={3}
            placeholder="Reason for flagging this document"
            className={inputClasses}
            value={reasonText}
            onChange={(event) => setReasonText(event.target.value)}
          />
          {reasonError && (
            <p className="mt-2 text-sm font-medium text-status-red" role="alert">
              {reasonError}
            </p>
          )}
          <button
            type="button"
            onClick={handleReasonSubmit}
            disabled={pendingActionId === reasonPrompt.documentId}
            className={`${primaryButtonClasses} mt-4 w-full`}
          >
            {pendingActionId === reasonPrompt.documentId ? "Submitting..." : "Confirm Flag"}
          </button>
        </Modal>
      )}
    </AppShell>
  );
}
