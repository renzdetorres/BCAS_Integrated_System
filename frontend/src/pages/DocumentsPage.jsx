import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DOCUMENT_TYPE_LABELS, getMyDocumentChecklist, uploadDocument } from "../api/documentApi.js";
import { ApiError } from "../api/apiClient.js";
import "./DocumentsPage.css";

const STATUS_LABELS = {
  NotSubmitted: "Not submitted",
  Pending: "Pending review",
  Verified: "Verified",
  Rejected: "Rejected",
  Flagged: "Flagged",
};

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function DocumentsPage() {
  const [applicationType, setApplicationType] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [needsApplication, setNeedsApplication] = useState(false);
  const [uploadingType, setUploadingType] = useState(null);
  const [itemErrors, setItemErrors] = useState({});

  useEffect(() => {
    let cancelled = false;

    getMyDocumentChecklist()
      .then((data) => {
        if (cancelled) return;
        setApplicationType(data.applicationType);
        setRequirements(data.requirements);
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 400) {
          setNeedsApplication(true);
        } else {
          setErrorMessage(error instanceof ApiError ? error.message : "Failed to load document checklist.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleFileSelected(documentType, event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadingType(documentType);
    setItemErrors((prev) => ({ ...prev, [documentType]: null }));

    try {
      const updated = await uploadDocument(documentType, file);
      setRequirements((prev) => prev.map((r) => (r.documentType === documentType ? updated : r)));
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to upload document. Please try again.";
      setItemErrors((prev) => ({ ...prev, [documentType]: message }));
    } finally {
      setUploadingType(null);
    }
  }

  return (
    <main className="documents-page">
      <div className="documents-shell">
        <Link className="documents-back-link" to="/portal">
          &larr; Back to dashboard
        </Link>

        <section className="documents-card">
          <h1>Document Requirements</h1>

          {isLoading && <p>Loading...</p>}

          {!isLoading && needsApplication && (
            <p className="form-error" role="alert">
              Submit an admission application before uploading documents.{" "}
              <Link to="/applications">Apply now</Link>.
            </p>
          )}

          {!isLoading && errorMessage && (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          )}

          {!isLoading && !needsApplication && !errorMessage && (
            <>
              <p className="documents-subtitle">
                Requirements for your {applicationType === "Transferee" ? "Transferee" : "New Student"} application.
                Only PDF files are accepted.
              </p>

              <ul className="documents-list">
                {requirements.map((requirement) => {
                  const canUpload = requirement.status === "NotSubmitted" || requirement.status === "Rejected" || requirement.status === "Flagged";
                  const isUploading = uploadingType === requirement.documentType;

                  return (
                    <li key={requirement.documentType}>
                      <div className="documents-list-header">
                        <span className="documents-type">
                          {DOCUMENT_TYPE_LABELS[requirement.documentType] ?? requirement.documentType}
                        </span>
                        <span className={`documents-status status-${requirement.status.toLowerCase()}`}>
                          {STATUS_LABELS[requirement.status] ?? requirement.status}
                        </span>
                      </div>

                      {requirement.fileName && (
                        <p className="documents-meta">
                          {requirement.fileName} &middot; Submitted {formatDate(requirement.uploadedAt)}
                        </p>
                      )}

                      {requirement.status === "Flagged" && requirement.flaggedReason && (
                        <p className="documents-flag-reason">Reason: {requirement.flaggedReason}</p>
                      )}

                      {itemErrors[requirement.documentType] && (
                        <p className="form-error" role="alert">
                          {itemErrors[requirement.documentType]}
                        </p>
                      )}

                      {canUpload && (
                        <label className={`documents-upload-button${isUploading ? " documents-upload-disabled" : ""}`}>
                          {isUploading ? "Uploading..." : requirement.status === "NotSubmitted" ? "Upload" : "Re-upload"}
                          <input
                            type="file"
                            accept="application/pdf"
                            disabled={isUploading}
                            onChange={(event) => handleFileSelected(requirement.documentType, event)}
                          />
                        </label>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
