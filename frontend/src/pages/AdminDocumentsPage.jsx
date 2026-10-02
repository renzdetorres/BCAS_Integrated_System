import { useCallback, useEffect, useState } from "react";
import { DOCUMENT_STATUSES, DOCUMENT_TYPES, getDocumentFile, searchDocuments } from "../api/adminDocumentsApi.js";
import { ApiError } from "../api/apiClient.js";
import { DOCUMENT_TYPE_LABELS } from "../api/documentApi.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import DataTable, { PersonCell, RowAction } from "../components/ui/DataTable.jsx";
import Modal, { DetailList } from "../components/ui/Modal.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import "./AdminDocumentsPage.css";

const initialFilters = { search: "", status: "", documentType: "" };

// Remarks only mean something for a document sent back to the applicant.
const STATUSES_WITH_REMARKS = new Set(["Flagged", "Rejected"]);

function documentLabel(documentType) {
  return DOCUMENT_TYPE_LABELS[documentType] ?? documentType;
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

/** The document's details and its PDF, previewed in place. */
function DocumentModal({ document, onClose }) {
  const [fileUrl, setFileUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;

    getDocumentFile(document.documentId)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setFileUrl(objectUrl);
      })
      .catch((error) => {
        if (!cancelled) setErrorMessage(error instanceof ApiError ? error.message : "Failed to load this file.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [document.documentId]);

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={documentLabel(document.documentType)}
      subtitle={`${document.applicantName} · ${document.applicantEmail}`}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          {fileUrl ? (
            <a className="btn btn-primary" href={fileUrl} download={document.fileName}>
              Download file
            </a>
          ) : null}
        </>
      }
    >
      <div className="ui-modal-section">
        <DetailList
          items={[
            { label: "Status", value: <StatusBadge status={document.status} /> },
            { label: "Uploaded", value: formatDateTime(document.uploadedAt) },
            {
              label: "Reviewed",
              value: document.reviewedAt
                ? `${formatDateTime(document.reviewedAt)}${document.reviewedByName ? ` by ${document.reviewedByName}` : ""}`
                : "Not reviewed yet",
            },
            { label: "File name", value: document.fileName },
            STATUSES_WITH_REMARKS.has(document.status)
              ? { label: "Remarks", value: document.flaggedReason ?? null, wide: true }
              : null,
          ]}
        />
      </div>
      <div className="ui-modal-section">
        {isLoading ? (
          <div className="admin-documents-preview admin-documents-preview-empty">Loading file...</div>
        ) : errorMessage ? (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        ) : (
          <iframe className="admin-documents-preview" src={fileUrl} title={`${documentLabel(document.documentType)} preview`} />
        )}
      </div>
    </Modal>
  );
}

export default function AdminDocumentsPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [viewing, setViewing] = useState(null);

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
      render: (row) => <PersonCell name={row.applicantName} detail={row.applicantEmail} />,
    },
    {
      key: "documentType",
      header: "Document",
      accessor: (row) => documentLabel(row.documentType),
      sortable: true,
    },
    {
      key: "status",
      header: "Status",
      accessor: (row) => row.status,
      sortable: true,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "remarks",
      header: "Remarks",
      accessor: (row) => (STATUSES_WITH_REMARKS.has(row.status) ? row.flaggedReason ?? "" : ""),
      render: (row) =>
        STATUSES_WITH_REMARKS.has(row.status) && row.flaggedReason ? (
          <span className="admin-documents-remarks">{row.flaggedReason}</span>
        ) : (
          <span className="ui-cell-muted">-</span>
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
      key: "action",
      header: "Action",
      align: "right",
      searchable: false,
      render: (row) => (
        <RowAction
          label="View file"
          icon="doc"
          onClick={() => setViewing(row)}
          ariaLabel={`View ${row.applicantName}'s ${documentLabel(row.documentType)}`}
        />
      ),
    },
  ];

  return (
    <AppLayout>
      <DataTable
        title="Document Verification Log"
        subtitle="Every document applicants have submitted and where it stands. Support Staff verify, reject or flag documents from their own queue; this log is read-only."
        columns={columns}
        rows={documents}
        getRowKey={(row) => row.documentId}
        isLoading={isLoading}
        errorMessage={errorMessage}
        emptyMessage="No documents match these filters."
        onRowClick={(row) => setViewing(row)}
        search={{
          value: filters.search,
          onChange: (value) => setFilters((prev) => ({ ...prev, search: value })),
          placeholder: "Search by applicant name or email",
        }}
        filters={[
          {
            key: "documentType",
            label: "All documents",
            value: filters.documentType,
            onChange: (value) => setFilters((prev) => ({ ...prev, documentType: value })),
            options: DOCUMENT_TYPES.map((type) => ({ value: type, label: documentLabel(type) })),
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

      {viewing ? <DocumentModal document={viewing} onClose={() => setViewing(null)} /> : null}
    </AppLayout>
  );
}
