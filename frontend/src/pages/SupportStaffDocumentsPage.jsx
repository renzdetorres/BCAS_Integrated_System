import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  bulkReviewDocuments,
  getDocumentFileForReview,
  listAllDocuments,
  listDocumentsForApplicant,
  reviewDocument,
} from "../api/supportStaffDocumentsApi.js";
import { ApiError } from "../api/apiClient.js";
import { useToast } from "../context/ToastContext.jsx";
import { useSession } from "../context/SessionContext.jsx";
import { DOCUMENT_TYPE_LABELS } from "../api/documentApi.js";
import FilePreviewModal from "../components/FilePreviewModal.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import DataTable, { PersonCell, RowAction } from "../components/ui/DataTable.jsx";
import Modal from "../components/ui/Modal.jsx";
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

// A document is still waiting on a decision while it is Pending or Flagged; Verified and Rejected are decided.
const OPEN_STATUSES = new Set(["Pending", "Flagged"]);

/**
 * One row per applicant, however many documents they uploaded. Applicants with something still to decide come
 * first (the one waiting longest on top); applicants whose documents are all approved or rejected sit at the
 * bottom of the queue. Inside an applicant, the open documents come before the decided ones.
 */
function groupByApplicant(documents) {
  const byApplicant = new Map();
  for (const document of documents) {
    if (!byApplicant.has(document.userId)) {
      byApplicant.set(document.userId, {
        userId: document.userId,
        name: document.applicantName,
        email: document.applicantEmail,
        documents: [],
      });
    }
    byApplicant.get(document.userId).documents.push(document);
  }

  const groups = [...byApplicant.values()].map((group) => {
    const documentsInOrder = [...group.documents].sort(
      (a, b) =>
        Number(!OPEN_STATUSES.has(a.status)) - Number(!OPEN_STATUSES.has(b.status)) ||
        new Date(b.uploadedAt) - new Date(a.uploadedAt),
    );
    const open = documentsInOrder.filter((d) => OPEN_STATUSES.has(d.status));
    const flagged = open.filter((d) => d.status === "Flagged").length;
    const rejected = documentsInOrder.filter((d) => d.status === "Rejected").length;
    const waitingSince = open.length > 0 ? Math.min(...open.map((d) => new Date(d.uploadedAt).getTime())) : null;

    let status = "Verified";
    if (flagged > 0) status = "Flagged";
    else if (open.length > 0) status = "Pending";
    else if (rejected > 0) status = "Rejected";

    return {
      ...group,
      documents: documentsInOrder,
      openCount: open.length,
      flaggedCount: flagged,
      status,
      waitingSince,
      lastUploadedAt: documentsInOrder.reduce((latest, d) => (d.uploadedAt > latest ? d.uploadedAt : latest), documentsInOrder[0].uploadedAt),
    };
  });

  return groups.sort((a, b) => {
    if ((a.openCount > 0) !== (b.openCount > 0)) return a.openCount > 0 ? -1 : 1;
    if (a.openCount > 0) return a.waitingSince - b.waitingSince;
    return new Date(b.lastUploadedAt) - new Date(a.lastUploadedAt);
  });
}

function summaryText(group) {
  const total = `${group.documents.length} document${group.documents.length === 1 ? "" : "s"}`;
  if (group.openCount === 0) return `${total}, all reviewed`;
  return `${total}, ${group.openCount} to review${group.flaggedCount > 0 ? ` (${group.flaggedCount} flagged)` : ""}`;
}

export default function SupportStaffDocumentsPage() {
  const [searchParams] = useSearchParams();
  const applicantId = searchParams.get("applicantId");
  const { showToast } = useToast();
  const { session } = useSession();
  // The Evaluator verifies documents; the Admin holds the same page under its own routes.
  const isAdmin = session.role === "Admin";
  const queuePath = isAdmin ? "/admin/document-verification" : "/evaluator/documents";
  const archivePath = isAdmin ? "/admin/document-archive" : "/evaluator/documents/archive";

  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [openUserId, setOpenUserId] = useState(applicantId);
  const [previewing, setPreviewing] = useState(null);

  const [pendingActionId, setPendingActionId] = useState(null);
  const [reasonPromptId, setReasonPromptId] = useState(null);
  const [reasonAction, setReasonAction] = useState(null);
  const [reasonText, setReasonText] = useState("");
  const [reasonError, setReasonError] = useState(null);
  const [isApprovingAll, setIsApprovingAll] = useState(false);

  const loadDocuments = useCallback(async () => {
    try {
      setDocuments(applicantId ? await listDocumentsForApplicant(applicantId) : await listAllDocuments());
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

  const groups = useMemo(() => groupByApplicant(documents), [documents]);
  const openGroup = groups.find((group) => group.userId === openUserId) ?? null;
  const applicantsToReview = groups.filter((group) => group.openCount > 0).length;

  function cancelReasonPrompt() {
    setReasonPromptId(null);
    setReasonAction(null);
    setReasonText("");
    setReasonError(null);
  }

  function closeCard() {
    cancelReasonPrompt();
    setOpenUserId(null);
  }

  function startReasonPrompt(documentId, action) {
    setReasonPromptId(documentId);
    setReasonAction(action);
    setReasonText("");
    setReasonError(null);
  }

  async function handleApprove(documentId) {
    setPendingActionId(documentId);
    try {
      await reviewDocument(documentId, { status: "Verified" });
      await loadDocuments();
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "Failed to approve the document.", "error");
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

  async function handleApproveAll(group) {
    const ids = group.documents.filter((d) => OPEN_STATUSES.has(d.status)).map((d) => d.documentId);
    if (ids.length === 0) return;

    setIsApprovingAll(true);
    try {
      const result = await bulkReviewDocuments(ids, { status: "Verified" });
      await loadDocuments();
      showToast(
        result.failures.length === 0
          ? `${result.succeededCount} document${result.succeededCount === 1 ? "" : "s"} approved.`
          : `${result.succeededCount} approved, ${result.failures.length} couldn't be reviewed (already handled or removed).`,
      );
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "Failed to approve the documents.", "error");
    } finally {
      setIsApprovingAll(false);
    }
  }

  const columns = [
    {
      key: "applicant",
      header: "Applicant",
      accessor: (group) => `${group.name} ${group.email}`,
      sortable: true,
      render: (group) => <PersonCell name={group.name} detail={group.email} />,
    },
    {
      key: "documents",
      header: "Documents",
      accessor: (group) => summaryText(group),
      searchable: false,
      render: (group) => <span className="dv-summary">{summaryText(group)}</span>,
    },
    {
      key: "status",
      header: "Status",
      accessor: (group) => group.status,
      sortable: true,
      render: (group) => <StatusBadge status={group.status} />,
    },
    {
      key: "lastUploadedAt",
      header: "Last upload",
      accessor: (group) => group.lastUploadedAt,
      sortable: true,
      searchable: false,
      render: (group) => formatDateTime(group.lastUploadedAt),
    },
    {
      key: "action",
      header: "",
      searchable: false,
      render: (group) => (
        <RowAction
          label={group.openCount > 0 ? "Review documents" : "View documents"}
          icon="folder"
          onClick={() => setOpenUserId(group.userId)}
          ariaLabel={`Open ${group.name}'s documents`}
        />
      ),
    },
  ];

  return (
    <AppLayout title="Document Verification">
      {applicantId ? (
        <p className="ss-documents-subtitle">
          Showing every document for <strong>{groups[0]?.name ?? "this applicant"}</strong>, any status.{" "}
          <Link className="ss-documents-queue-link" to={queuePath}>
            View the full verification queue
          </Link>
          {" instead."}
        </p>
      ) : (
        <p className="ss-documents-subtitle">
          One row per applicant. Open a row to look at each document and approve, reject or flag it; rejecting or
          flagging needs a reason, and the applicant can upload a corrected file afterward. Applicants whose documents
          are all decided move to the bottom of the queue.{" "}
          <Link className="ss-documents-queue-link" to={archivePath}>
            View the document archive
          </Link>
          .
        </p>
      )}

      <Card tier="data">
        {errorMessage && (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        )}

        <DataTable
          columns={columns}
          rows={groups}
          getRowKey={(group) => group.userId}
          isLoading={isLoading}
          emptyMessage={applicantId ? "This applicant hasn't uploaded any documents yet." : "No documents have been uploaded yet."}
          searchPlaceholder="Search by name or email"
          onRowClick={(group) => setOpenUserId(group.userId)}
          footerNote={
            applicantsToReview > 0
              ? `${applicantsToReview} applicant${applicantsToReview === 1 ? "" : "s"} waiting on a decision.`
              : "Nothing is waiting on a decision."
          }
        />
      </Card>

      {openGroup && !previewing && (
        <Modal
          open
          onClose={closeCard}
          size="lg"
          title={openGroup.name}
          subtitle={`${openGroup.email} · ${summaryText(openGroup)}`}
          busy={isApprovingAll}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={closeCard} disabled={isApprovingAll}>
                Close
              </button>
              {openGroup.openCount > 0 && (
                <button type="button" className="btn btn-primary" onClick={() => handleApproveAll(openGroup)} disabled={isApprovingAll}>
                  {isApprovingAll ? "Approving..." : `Approve all ${openGroup.openCount} open`}
                </button>
              )}
            </>
          }
        >
          <ul className="dv-doc-list">
            {openGroup.documents.map((document) => {
              const isOpen = OPEN_STATUSES.has(document.status);
              const busy = pendingActionId === document.documentId;
              return (
                <li key={document.documentId} className={`dv-doc${isOpen ? "" : " dv-doc-decided"}`}>
                  <div className="dv-doc-head">
                    <span className="dv-doc-type">{DOCUMENT_TYPE_LABELS[document.documentType] ?? document.documentType}</span>
                    <StatusBadge status={document.status} />
                  </div>
                  <p className="dv-doc-meta">
                    {document.fileName} &middot; Uploaded {formatDateTime(document.uploadedAt)}
                  </p>
                  {document.flaggedReason && <p className="ss-documents-reason">Reason: {document.flaggedReason}</p>}
                  {document.reviewedByName && (
                    <p className="ss-documents-reviewed-by">
                      Last reviewed by {document.reviewedByName} on {formatDateTime(document.reviewedAt)}
                    </p>
                  )}

                  <div className="dv-doc-actions">
                    <button type="button" className="documents-view-link ss-documents-view" onClick={() => setPreviewing(document)}>
                      View file
                    </button>
                    {isOpen &&
                      (reasonPromptId === document.documentId ? (
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
                            <button type="button" className="reason-submit" onClick={() => handleReasonSubmit(document.documentId)} disabled={busy}>
                              {busy ? "Submitting..." : `Confirm ${reasonAction}`}
                            </button>
                            <button type="button" className="reason-cancel" onClick={cancelReasonPrompt} disabled={busy}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="row-actions">
                          <button type="button" className="action-approve" onClick={() => handleApprove(document.documentId)} disabled={busy}>
                            {busy ? "Saving..." : "Approve"}
                          </button>
                          <button type="button" className="action-reject" onClick={() => startReasonPrompt(document.documentId, "Rejected")} disabled={busy}>
                            Reject
                          </button>
                          <button type="button" className="action-flag" onClick={() => startReasonPrompt(document.documentId, "Flagged")} disabled={busy}>
                            Flag
                          </button>
                        </div>
                      ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </Modal>
      )}

      {previewing && (
        <FilePreviewModal
          title={DOCUMENT_TYPE_LABELS[previewing.documentType] ?? previewing.documentType}
          subtitle={`${previewing.applicantName} · ${previewing.applicantEmail}`}
          fileName={previewing.fileName}
          loadFile={() => getDocumentFileForReview(previewing.documentId)}
          onClose={() => setPreviewing(null)}
        />
      )}
    </AppLayout>
  );
}
