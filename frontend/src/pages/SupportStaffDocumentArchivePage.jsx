import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AppShell from "../components/layout/AppShell.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { DOCUMENT_TYPES, searchArchivedDocuments } from "../api/supportStaffDocumentsApi.js";
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

export default function SupportStaffDocumentArchivePage() {
  const [search, setSearch] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const load = useCallback(() => {
    setIsLoading(true);
    searchArchivedDocuments({ search, documentType })
      .then((data) => {
        setDocuments(data);
        setErrorMessage(null);
      })
      .catch((error) => {
        setErrorMessage(error instanceof ApiError ? error.message : "Failed to load the document archive.");
      })
      .finally(() => setIsLoading(false));
  }, [search, documentType]);

  useEffect(() => {
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
  }, [load]);

  const columns = [
    {
      key: "applicant",
      header: "Applicant",
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-800">{row.applicantName}</p>
          <p className="text-xs text-slate-400">{row.applicantEmail}</p>
        </div>
      ),
    },
    { key: "type", header: "Document Type", render: (row) => row.documentType },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <div>
          <StatusBadge status={row.status} />
          {row.flaggedReason && <p className="mt-1 text-xs text-status-red">Reason: {row.flaggedReason}</p>}
        </div>
      ),
    },
    {
      key: "uploaded",
      header: "Uploaded",
      sortable: true,
      sortValue: (row) => new Date(row.uploadedAt).getTime(),
      render: (row) => formatDateTime(row.uploadedAt),
    },
    {
      key: "updated",
      header: "Archived/Updated",
      sortable: true,
      sortValue: (row) => new Date(row.updatedAt).getTime(),
      render: (row) => formatDateTime(row.updatedAt),
    },
  ];

  const typeOptions = [
    { value: "", label: "All document types" },
    ...DOCUMENT_TYPES.map((type) => ({ value: type, label: type })),
  ];

  return (
    <AppShell>
      <Link
        to="/support-staff/documents"
        className="inline-flex items-center gap-1 text-sm font-semibold text-forest hover:underline"
      >
        <ArrowLeft size={16} /> Back to Document Verification
      </Link>

      <div className="mt-2">
        <h1 className="text-2xl font-extrabold text-slate-900">Document Archive</h1>
        <p className="mt-1 text-sm text-slate-500">
          Archived documents, kept separate from the active verification queue. Browse or search here without
          cluttering the queue.
        </p>
      </div>

      {errorMessage && (
        <p className="mt-4 text-sm font-medium text-status-red" role="alert">
          {errorMessage}
        </p>
      )}

      <div className="mt-6">
        <DataTable
          columns={columns}
          rows={documents}
          rowKey={(row) => row.documentId}
          isLoading={isLoading}
          emptyMessage="No archived documents match this search."
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by applicant name or email..."
          filters={[{ label: "Type", value: documentType, onChange: setDocumentType, options: typeOptions }]}
        />
      </div>
    </AppShell>
  );
}
