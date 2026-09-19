import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, AlertTriangle, Circle, UploadCloud } from "lucide-react";
import AppShell from "../components/layout/AppShell.jsx";
import Card from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import ProgressBar from "../components/ui/ProgressBar.jsx";
import { DOCUMENT_TYPE_LABELS, getMyDocumentChecklist, uploadDocument } from "../api/documentApi.js";
import { ApiError } from "../api/apiClient.js";

const STATUS_LABELS = {
  NotSubmitted: "Not Uploaded",
  Pending: "Uploaded",
  Verified: "Verified",
  Rejected: "Flagged",
  Flagged: "Flagged",
};

const STATUS_ICON = {
  NotSubmitted: { Icon: Circle, className: "bg-status-grayBg text-status-gray" },
  Pending: { Icon: UploadCloud, className: "bg-status-blueBg text-status-blue" },
  Verified: { Icon: CheckCircle2, className: "bg-status-greenBg text-status-green" },
  Rejected: { Icon: AlertTriangle, className: "bg-status-redBg text-status-red" },
  Flagged: { Icon: AlertTriangle, className: "bg-status-redBg text-status-red" },
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

  const verifiedCount = requirements.filter((r) => r.status === "Verified").length;

  return (
    <AppShell badges={{ documents: requirements.length - verifiedCount || undefined }}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Documents</h1>
          {!isLoading && !needsApplication && !errorMessage && (
            <p className="mt-1 text-sm text-slate-500">
              {verifiedCount}/{requirements.length} verified · Upload all required documents to complete your
              application
            </p>
          )}
        </div>
        {!isLoading && !needsApplication && !errorMessage && (
          <div className="w-full max-w-[220px]">
            <p className="mb-1 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
              Progress
            </p>
            <ProgressBar value={verifiedCount} max={requirements.length} />
          </div>
        )}
      </div>

      {isLoading && <p className="mt-6 text-sm text-slate-400">Loading...</p>}

      {!isLoading && needsApplication && (
        <Card className="mt-6">
          <p className="text-sm font-medium text-status-red" role="alert">
            Submit an admission application before uploading documents.{" "}
            <Link to="/app/my-application" className="underline">
              Apply now
            </Link>
            .
          </p>
        </Card>
      )}

      {!isLoading && errorMessage && (
        <Card className="mt-6">
          <p className="text-sm font-medium text-status-red" role="alert">
            {errorMessage}
          </p>
        </Card>
      )}

      {!isLoading && !needsApplication && !errorMessage && (
        <div className="mt-6 space-y-3">
          {requirements.map((requirement) => {
            const canUpload =
              requirement.status === "NotSubmitted" ||
              requirement.status === "Rejected" ||
              requirement.status === "Flagged";
            const isUploading = uploadingType === requirement.documentType;
            const { Icon, className } = STATUS_ICON[requirement.status] ?? STATUS_ICON.NotSubmitted;
            const isFlagged = requirement.status === "Flagged" || requirement.status === "Rejected";

            return (
              <Card key={requirement.documentType}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${className}`}>
                      <Icon size={20} />
                    </span>
                    <div>
                      <p className="font-bold text-slate-900">
                        {DOCUMENT_TYPE_LABELS[requirement.documentType] ?? requirement.documentType}
                      </p>
                      <StatusBadge status={requirement.status} label={STATUS_LABELS[requirement.status]} />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {requirement.fileName && (
                      <span className="text-sm text-slate-400">{requirement.fileName}</span>
                    )}
                    {canUpload && (
                      <label
                        className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold ${
                          isFlagged
                            ? "bg-forest text-white hover:bg-forest-dark"
                            : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                        } ${isUploading ? "pointer-events-none opacity-60" : ""}`}
                      >
                        {isUploading
                          ? "Uploading..."
                          : isFlagged
                          ? "Re-upload"
                          : requirement.status === "NotSubmitted"
                          ? "Upload"
                          : "Replace"}
                        <input
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          disabled={isUploading}
                          onChange={(event) => handleFileSelected(requirement.documentType, event)}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {requirement.status === "Flagged" && requirement.flaggedReason && (
                  <p className="mt-3 rounded-lg bg-status-redBg px-3 py-2 text-sm text-status-red">
                    ⚠ Flagged: {requirement.flaggedReason}
                  </p>
                )}

                {itemErrors[requirement.documentType] && (
                  <p className="mt-3 text-sm font-medium text-status-red" role="alert">
                    {itemErrors[requirement.documentType]}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
