import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DOCUMENT_TYPE_LABELS, getMyDocumentChecklist, uploadDocument } from "../api/documentApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import ProgressBar from "../components/ui/ProgressBar.jsx";
import "./DocumentsPage.css";

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
    <AppLayout title="Documents">
      <Card>
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

            <div className="documents-progress">
              <ProgressBar
                value={requirements.filter((r) => r.status === "Verified").length}
                max={requirements.length}
                label={`Verified (${requirements.filter((r) => r.status === "Verified").length}/${requirements.length})`}
              />
            </div>

            <ul className="documents-list">
              {requirements.map((requirement) => {
                const canUpload = requirement.status === "NotSubmitted" || requirement.status === "Rejected" || requirement.status === "Flagged";
                const isUploading = uploadingType === requirement.documentType;
                const needsAttention = requirement.status === "Flagged" || requirement.status === "Rejected";

                return (
                  <li
                    key={requirement.documentType}
                    className={needsAttention ? "documents-item-flagged" : undefined}
                  >
                    <div className="documents-list-header">
                      <span className="documents-type">
                        {DOCUMENT_TYPE_LABELS[requirement.documentType] ?? requirement.documentType}
                      </span>
                      <StatusBadge status={requirement.status === "NotSubmitted" ? "NotUploaded" : requirement.status} />
                    </div>

                    {requirement.fileName && (
                      <p className="documents-meta">
                        {requirement.fileName} &middot; Submitted {formatDate(requirement.uploadedAt)}
                      </p>
                    )}

                    {requirement.status === "Flagged" && requirement.flaggedReason && (
                      <p className="documents-flag-reason">
                        <strong>Needs your attention:</strong> {requirement.flaggedReason}
                      </p>
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
      </Card>
    </AppLayout>
  );
}
