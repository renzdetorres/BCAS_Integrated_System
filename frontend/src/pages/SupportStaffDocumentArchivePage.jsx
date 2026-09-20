import { useCallback, useEffect, useState } from "react";
import { DOCUMENT_TYPES, searchArchivedDocuments } from "../api/supportStaffDocumentsApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import "./SupportStaffDocumentArchivePage.css";

const initialFilters = { search: "", documentType: "" };

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
  const [filters, setFilters] = useState(initialFilters);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const loadDocuments = useCallback(async (activeFilters) => {
    setIsLoading(true);
    try {
      const data = await searchArchivedDocuments(activeFilters);
      setDocuments(data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to load the document archive.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => loadDocuments(filters), 300);
    return () => clearTimeout(timeout);
  }, [filters, loadDocuments]);

  const columns = [
    {
      key: "applicant",
      header: "Applicant",
      accessor: (row) => row.applicantName,
      sortable: true,
      render: (row) => (
        <div className="ss-archive-cell">
          <span className="ss-archive-name">{row.applicantName}</span>
          <span className="ss-archive-email">{row.applicantEmail}</span>
        </div>
      ),
    },
    { key: "documentType", header: "Document Type", sortable: true },
    {
      key: "status",
      header: "Status",
      accessor: (row) => row.status,
      sortable: true,
      render: (row) => (
        <>
          <StatusBadge status={row.status} />
          {row.flaggedReason && <span className="ss-archive-reason">Reason: {row.flaggedReason}</span>}
        </>
      ),
    },
    {
      key: "uploadedAt",
      header: "Uploaded",
      accessor: (row) => row.uploadedAt,
      sortable: true,
      render: (row) => formatDateTime(row.uploadedAt),
    },
    {
      key: "updatedAt",
      header: "Archived/Updated",
      accessor: (row) => row.updatedAt,
      sortable: true,
      render: (row) => formatDateTime(row.updatedAt),
    },
  ];

  return (
    <AppLayout title="Document Archive">
      <Card>
        <p className="ss-archive-subtitle">
          Archived documents, kept separate from the active verification queue. Browse or search here without
          cluttering the queue.
        </p>

        {errorMessage && (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        )}

        <DataTable
          columns={columns}
          rows={documents}
          getRowKey={(row) => row.documentId}
          isLoading={isLoading}
          emptyMessage="No archived documents match this search."
          search={{
            value: filters.search,
            onChange: (value) => setFilters((prev) => ({ ...prev, search: value })),
            placeholder: "Search by applicant name or email",
          }}
          filters={[
            {
              key: "documentType",
              label: "All document types",
              value: filters.documentType,
              onChange: (value) => setFilters((prev) => ({ ...prev, documentType: value })),
              options: DOCUMENT_TYPES.map((type) => ({ value: type, label: type })),
            },
          ]}
        />
      </Card>
    </AppLayout>
  );
}
