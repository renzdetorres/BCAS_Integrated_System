import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DOCUMENT_STATUSES, DOCUMENT_TYPES, searchDocuments } from "../api/adminDocumentsApi.js";
import { ApiError } from "../api/apiClient.js";
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
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
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
    loadDocuments(appliedFilters);
  }, [appliedFilters, loadDocuments]);

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setAppliedFilters(filters);
  }

  function handleClear() {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
  }

  return (
    <main className="admin-documents-page">
      <div className="admin-documents-shell">
        <Link className="admin-documents-back-link" to="/portal">
          &larr; Back to dashboard
        </Link>
        <h1>Documents</h1>
        <p className="admin-documents-subtitle">
          Every document submitted across all applicants, with verification status and, for a
          flagged or rejected document, the reason given.
        </p>

        <form className="admin-documents-filters" onSubmit={handleSubmit}>
          <div className="filter-row">
            <input
              name="search"
              type="text"
              placeholder="Search by applicant name or email"
              value={filters.search}
              onChange={handleFilterChange}
            />
            <select name="documentType" value={filters.documentType} onChange={handleFilterChange}>
              <option value="">All document types</option>
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <select name="status" value={filters.status} onChange={handleFilterChange}>
              <option value="">All statuses</option>
              {DOCUMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <button type="submit">Search</button>
            <button type="button" className="admin-documents-clear" onClick={handleClear}>
              Clear
            </button>
          </div>
        </form>

        {errorMessage && (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        )}

        {isLoading ? (
          <p>Loading...</p>
        ) : documents.length === 0 ? (
          <p>No documents match these filters.</p>
        ) : (
          <table className="admin-documents-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Document</th>
                <th>File</th>
                <th>Status</th>
                <th>Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.documentId}>
                  <td>
                    <div className="admin-documents-applicant">
                      <span className="admin-documents-name">{document.applicantName}</span>
                      <span className="admin-documents-email">{document.applicantEmail}</span>
                    </div>
                  </td>
                  <td>{document.documentType}</td>
                  <td>{document.fileName}</td>
                  <td>
                    <span className={`status-badge status-${document.status.toLowerCase()}`}>
                      {document.status}
                    </span>
                    {document.flaggedReason && (
                      <p className="admin-documents-reason">{document.flaggedReason}</p>
                    )}
                  </td>
                  <td>{formatDateTime(document.uploadedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
