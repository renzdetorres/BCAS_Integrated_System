import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DOCUMENT_TYPE_LABELS, getMyDocumentChecklist } from "../../api/documentApi.js";
import { formatsFor, formatsLabel, isRequiredDocument } from "../../config/requiredDocuments.js";
import StatusBadge from "../ui/StatusBadge.jsx";
import "./SubmittedDocuments.css";

const NEEDS_UPLOAD = new Set(["NotSubmitted", "Rejected", "Flagged"]);

/**
 * The bottom of a submitted application: every document it needs, in what
 * format, where each one stands, and a way to upload the ones still missing.
 * Uploading itself happens on the Documents page, so this links there.
 */
export default function SubmittedDocuments() {
  const [requirements, setRequirements] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMyDocumentChecklist()
      .then((data) => {
        if (!cancelled) setRequirements(data.requirements ?? []);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return (
      <section className="submitted-docs" aria-labelledby="submitted-docs-title">
        <h3 id="submitted-docs-title">Documents</h3>
        <p className="submitted-docs-note">Your document list couldn&apos;t be loaded. Open the Documents page to see what is needed.</p>
        <Link className="btn btn-secondary" to="/documents">
          Go to Documents
        </Link>
      </section>
    );
  }

  if (!requirements) return null;

  const toUpload = requirements.filter((r) => isRequiredDocument(r.documentType) && NEEDS_UPLOAD.has(r.status));

  return (
    <section className="submitted-docs" aria-labelledby="submitted-docs-title">
      <div className="submitted-docs-head">
        <div>
          <h3 id="submitted-docs-title">Documents to upload</h3>
          <p className="submitted-docs-note">
            {toUpload.length > 0
              ? `${toUpload.length} required document${toUpload.length === 1 ? " is" : "s are"} still to upload. Staff can only review your application once they are in.`
              : "Every required document is uploaded. Staff will review them and tell you if anything needs to be corrected."}
          </p>
        </div>
        <Link className={`btn ${toUpload.length > 0 ? "btn-primary" : "btn-secondary"}`} to="/documents">
          {toUpload.length > 0 ? "Upload documents" : "View documents"}
        </Link>
      </div>

      <ul className="submitted-docs-list">
        {requirements.map((requirement) => {
          const required = isRequiredDocument(requirement.documentType);
          const needsUpload = NEEDS_UPLOAD.has(requirement.status);
          const formats = requirement.acceptedFormats?.length ? requirement.acceptedFormats : formatsFor(requirement.documentType);
          return (
            <li key={requirement.documentType} className={needsUpload && required ? "submitted-docs-item submitted-docs-missing" : "submitted-docs-item"}>
              <div className="submitted-docs-name">
                <span className="submitted-docs-title">
                  {DOCUMENT_TYPE_LABELS[requirement.documentType] ?? requirement.documentType}
                  {!required && <span className="submitted-docs-optional"> (optional)</span>}
                </span>
                <span className="submitted-docs-format">Upload as {formatsLabel(formats)}</span>
                {(requirement.status === "Rejected" || requirement.status === "Flagged") && (
                  <span className="submitted-docs-reason">
                    {requirement.status === "Rejected" ? "Rejected" : "Needs your attention"}: {requirement.flaggedReason || "upload a corrected file."}
                  </span>
                )}
              </div>
              <StatusBadge status={requirement.status === "NotSubmitted" ? "NotUploaded" : requirement.status} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
