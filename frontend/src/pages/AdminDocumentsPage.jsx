import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle, Clock, XCircle } from "lucide-react";
import AppShell from "../components/layout/AppShell.jsx";
import Card from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { DOCUMENT_STATUSES, DOCUMENT_TYPES, searchDocuments } from "../api/adminDocumentsApi.js";
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

const STATUS_ICON = {
  Pending: { Icon: Clock, className: "bg-status-amberBg text-[#9C6B12]" },
  Verified: { Icon: CheckCircle2, className: "bg-status-greenBg text-status-green" },
  Flagged: { Icon: AlertTriangle, className: "bg-status-redBg text-status-red" },
  Rejected: { Icon: XCircle, className: "bg-status-redBg text-status-red" },
};

// Verify/flag actions live on the Support Staff Document Verification
// screen (the backend only authorizes SupportStaff for the review
// endpoint) - this is a read-only oversight view for Admin-Registrar.
export default function AdminDocumentsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const load = useCallback(() => {
    setIsLoading(true);
    searchDocuments({ search, status, documentType })
      .then((data) => {
        setDocuments(data);
        setErrorMessage(null);
      })
      .catch((error) => setErrorMessage(error instanceof ApiError ? error.message : "Failed to load documents."))
      .finally(() => setIsLoading(false));
  }, [search, status, documentType]);

  useEffect(() => {
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
  }, [load]);

  const counts = useMemo(
    () => ({
      pending: documents.filter((d) => d.status === "Pending").length,
      flagged: documents.filter((d) => d.status === "Flagged" || d.status === "Rejected").length,
    }),
    [documents]
  );

  return (
    <AppShell badges={{ documents: counts.pending || undefined }}>
      <h1 className="text-2xl font-extrabold text-slate-900">Document Verification</h1>
      <p className="mt-1 text-sm text-slate-500">
        {counts.pending} pending · {counts.flagged} flagged
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by applicant name or email"
          className="min-w-[220px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest"
        />
        <select
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest"
        >
          <option value="">All document types</option>
          {DOCUMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest"
        >
          <option value="">All statuses</option>
          {DOCUMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {errorMessage && (
        <p className="mt-4 text-sm font-medium text-status-red" role="alert">
          {errorMessage}
        </p>
      )}

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-slate-400">Loading...</p>}
        {!isLoading && documents.length === 0 && (
          <p className="text-sm text-slate-400">No documents match these filters.</p>
        )}
        {!isLoading &&
          documents.map((doc) => {
            const { Icon, className } = STATUS_ICON[doc.status] ?? STATUS_ICON.Pending;
            return (
              <Card key={doc.documentId}>
                <div className="flex items-center gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${className}`}>
                    <Icon size={20} />
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900">{doc.documentType}</p>
                      <StatusBadge status={doc.status} />
                    </div>
                    <p className="text-xs text-slate-400">
                      {doc.applicantName} · {doc.applicantEmail} · {doc.fileName}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs text-slate-400">{formatDateTime(doc.uploadedAt)}</p>
                </div>
                {(doc.status === "Flagged" || doc.status === "Rejected") && doc.flaggedReason && (
                  <p className="mt-3 rounded-lg bg-status-redBg px-3 py-2 text-sm text-status-red">
                    ⚠ {doc.flaggedReason}
                  </p>
                )}
              </Card>
            );
          })}
      </div>
    </AppShell>
  );
}
