import { useCallback, useEffect, useState } from "react";
import { DOCUMENT_STATUSES, DOCUMENT_TYPES, searchDocuments } from "../api/adminDocumentsApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import "./AdminDocumentsPage.css";

const initialFilters = { search: "", status: "", documentType: "" };

function formatDateTime(isoDateTime) {
  return new Date(isoDateTime).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminDocumentsPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const loadDocuments = useCallback(async (activeFilters) => {
    setIsLoading(true);
    try {
      const data = await searchDocuments(activeFilters);
      setDocuments(data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to load documents.");
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
        <div className="admin-documents-applicant">
          <span className="admin-documents-name">{row.applicantName}</span>
          <span className="admin-documents-email">{row.applicantEmail}</span>
        </div>
      ),
    },
    { key: "documentType", header: "Document", sortable: true },
    { key: "fileName", header: "File" },
    {
      key: "status",
      header: "Status",
      accessor: (row) => row.status,
      sortable: true,
      render: (row) => (
        <>
          <StatusBadge status={row.status} />
          {row.flaggedReason && <p className="admin-documents-reason">{row.flaggedReason}</p>}
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
  ];

  return (
    <AppLayout title="Document Verification">
      <Card tier="data">
        <p className="admin-documents-subtitle">
          Every document submitted across all applicants, with verification status and, for a
          flagged or rejected document, the reason given.
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
          emptyMessage="No documents match these filters."
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
            {
              key: "status",
              label: "All statuses",
              value: filters.status,
              onChange: (value) => setFilters((prev) => ({ ...prev, status: value })),
              options: DOCUMENT_STATUSES.map((status) => ({ value: status, label: status })),
            },
          ]}
        />
      </Card>
    </AppLayout>
  );
}
