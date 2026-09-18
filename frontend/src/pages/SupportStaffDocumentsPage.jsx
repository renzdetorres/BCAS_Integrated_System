import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listPendingAndFlaggedDocuments } from "../api/supportStaffDocumentsApi.js";
import { ApiError } from "../api/apiClient.js";
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

export default function SupportStaffDocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    listPendingAndFlaggedDocuments()
      .then((data) => {
        if (!cancelled) setDocuments(data);
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof ApiError ? error.message : "Failed to load documents.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="ss-documents-page">
      <div className="ss-documents-shell">
        <Link className="ss-documents-back-link" to="/portal">
          &larr; Back to dashboard
        </Link>
        <h1>Document Verification</h1>
        <p className="ss-documents-subtitle">
          Documents awaiting review or currently flagged. Approve/reject/flag actions are coming soon.
        </p>

        <section className="ss-documents-card">
          {errorMessage && (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          )}

          {isLoading ? (
            <p>Loading...</p>
          ) : documents.length === 0 ? (
            <p>No documents are awaiting review or flagged right now.</p>
          ) : (
            <table className="ss-documents-table">
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Document Type</th>
                  <th>Status</th>
                  <th>Uploaded</th>
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
                      <span className={document.status === "Flagged" ? "status-flagged" : "status-pending"}>
                        {document.status}
                      </span>
                    </td>
                    <td>{formatDateTime(document.uploadedAt)}</td>
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
