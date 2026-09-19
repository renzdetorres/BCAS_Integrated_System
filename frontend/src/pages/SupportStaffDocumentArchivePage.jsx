import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DOCUMENT_TYPES, searchArchivedDocuments } from "../api/supportStaffDocumentsApi.js";
import { ApiError } from "../api/apiClient.js";
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
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
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

  return (
    <main className="ss-archive-page">
      <div className="ss-archive-shell">
        <Link className="ss-archive-back-link" to="/support-staff/documents">
          &larr; Back to Document Verification
        </Link>
        <h1>Document Archive</h1>
        <p className="ss-archive-subtitle">
          Archived documents, kept separate from the active verification queue. Browse or search here without
          cluttering the queue.
        </p>

        <section className="ss-archive-card">
          <form className="ss-archive-filters" onSubmit={handleSubmit}>
            <input
              type="text"
              name="search"
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
            <button type="submit">Search</button>
          </form>

          {errorMessage && (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          )}

          {isLoading ? (
            <p>Loading...</p>
          ) : documents.length === 0 ? (
            <p>No archived documents match this search.</p>
          ) : (
            <table className="ss-archive-table">
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Document Type</th>
                  <th>Status</th>
                  <th>Uploaded</th>
                  <th>Archived/Updated</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <tr key={document.documentId}>
                    <td>
                      <span className="ss-archive-name">{document.applicantName}</span>
                      <span className="ss-archive-email">{document.applicantEmail}</span>
                    </td>
                    <td>{document.documentType}</td>
                    <td>
                      <span className={`status-${document.status.toLowerCase()}`}>{document.status}</span>
                      {document.flaggedReason && (
                        <span className="ss-archive-reason">Reason: {document.flaggedReason}</span>
                      )}
                    </td>
                    <td>{formatDateTime(document.uploadedAt)}</td>
                    <td>{formatDateTime(document.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  );
}
