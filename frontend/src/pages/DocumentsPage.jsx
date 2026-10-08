import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  DOCUMENT_TYPE_LABELS,
  getMyDocumentChecklist,
  getMyScholarshipDocumentChecklist,
  uploadDocument,
} from "../api/documentApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import ProgressBar from "../components/ui/ProgressBar.jsx";
import { REQUIRED_NOTE, isRequiredDocument } from "../config/requiredDocuments.js";
import "./DocumentsPage.css";

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** One checklist: progress bar plus an upload row per requirement. */
function DocumentChecklist({ requirements, onUploaded }) {
  const [uploadingType, setUploadingType] = useState(null);
  const [itemErrors, setItemErrors] = useState({});
  const verified = requirements.filter((r) => r.status === "Verified").length;

  async function handleFileSelected(documentType, event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadingType(documentType);
    setItemErrors((prev) => ({ ...prev, [documentType]: null }));

    try {
      const updated = await uploadDocument(documentType, file);
      onUploaded(updated);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to upload document. Please try again.";
      setItemErrors((prev) => ({ ...prev, [documentType]: message }));
    } finally {
      setUploadingType(null);
    }
  }

  return (
    <>
      <div className="documents-progress">
        <ProgressBar value={verified} max={requirements.length} label={`Verified (${verified}/${requirements.length})`} />
      </div>

      <ul className="documents-list">
        {requirements.map((requirement) => {
          const canUpload = requirement.status === "NotSubmitted" || requirement.status === "Rejected" || requirement.status === "Flagged";
          const isUploading = uploadingType === requirement.documentType;
          const needsAttention = requirement.status === "Flagged" || requirement.status === "Rejected";

          return (
            <li key={requirement.documentType} className={needsAttention ? "documents-item-flagged" : undefined}>
              <div className="documents-list-header">
                <span className="documents-type">
                  {DOCUMENT_TYPE_LABELS[requirement.documentType] ?? requirement.documentType}
                  {isRequiredDocument(requirement.documentType) ? (
                    <span className="required-mark" title="Required" aria-label="required">
                      {" "}
                      *
                    </span>
                  ) : null}
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
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
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
  );
}

export default function DocumentsPage() {
  const [applicationType, setApplicationType] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [scholarshipRequirements, setScholarshipRequirements] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [needsApplication, setNeedsApplication] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const admission = getMyDocumentChecklist()
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
      });

    // A 400 here only means no scholarship application yet - the section is simply hidden.
    const scholarship = getMyScholarshipDocumentChecklist()
      .then((data) => {
        if (!cancelled) setScholarshipRequirements(data.requirements);
      })
      .catch(() => {});

    Promise.all([admission, scholarship]).finally(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // One upload can satisfy both checklists (report card, 2x2 photo), so refresh whichever list holds it.
  function handleUploaded(updated) {
    const replace = (list) => list.map((r) => (r.documentType === updated.documentType ? updated : r));
    setRequirements((prev) => replace(prev));
    setScholarshipRequirements((prev) => (prev ? replace(prev) : prev));
  }

  const showAdmission = !needsApplication && !errorMessage;

  return (
    <AppLayout title="Documents">
      {(isLoading || needsApplication || errorMessage || showAdmission) && (
        <Card>
          {isLoading && <p>Loading...</p>}

          {!isLoading && needsApplication && (
            <p className="form-error" role="alert">
              Submit an admission application before uploading admission documents.{" "}
              <Link to="/applications">Apply now</Link>.
            </p>
          )}

          {!isLoading && errorMessage && (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          )}

          {!isLoading && showAdmission && (
            <>
              <p className="documents-subtitle">
                Requirements for your {applicationType === "Transferee" ? "Transferee" : "New Student"} application.{" "}
                {REQUIRED_NOTE} PDF, JPG or PNG files, up to 10 MB each.
              </p>
              <DocumentChecklist requirements={requirements} onUploaded={handleUploaded} />
            </>
          )}
        </Card>
      )}

      {!isLoading && scholarshipRequirements && (
        <Card>
          <h2 className="documents-section-title">Scholarship application</h2>
          <p className="documents-subtitle">
            Documentary requirements for your scholarship application. The report card must be a certified true copy.{" "}
            {REQUIRED_NOTE} PDF, JPG or PNG files, up to 10 MB each.
          </p>
          <DocumentChecklist requirements={scholarshipRequirements} onUploaded={handleUploaded} />
        </Card>
      )}
    </AppLayout>
  );
}
