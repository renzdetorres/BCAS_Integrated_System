import { useEffect, useState } from "react";
import { getMyApplicationTracking } from "../api/applicationTrackingApi.js";
import { DOCUMENT_TYPE_LABELS } from "../api/documentApi.js";
import { ApiError } from "../api/apiClient.js";
import WorkflowStepper, { ADMISSION_STEP_LABELS, SCHOLARSHIP_STEP_LABELS } from "../components/WorkflowStepper.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import "./ApplicationTrackingPage.css";

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ApplicationTrackingPage() {
  const [tracking, setTracking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getMyApplicationTracking()
      .then((data) => {
        if (!cancelled) setTracking(data);
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof ApiError ? error.message : "Failed to load application tracking.");
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
    <AppLayout title="Application Tracking">
      <Card>
        {isLoading && <p>Loading...</p>}

        {errorMessage && (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        )}

        {!isLoading && !errorMessage && tracking && (
          <>
            {tracking.admissionApplications.length === 0 && tracking.scholarshipApplications.length === 0 && (
              <p>You haven&apos;t submitted any applications yet.</p>
            )}

            {tracking.admissionApplications.map((application) => (
              <div key={application.applicationId} className="tracking-application">
                <div className="tracking-application-header">
                  <span className="tracking-application-title">
                    Admission &middot; {application.courseAppliedFor}
                  </span>
                  <span className="tracking-application-meta">
                    Submitted {formatDate(application.submittedAt)}
                  </span>
                </div>
                <WorkflowStepper steps={application.steps} labels={ADMISSION_STEP_LABELS} />
              </div>
            ))}

            {tracking.scholarshipApplications.map((application) => (
              <div key={application.applicationId} className="tracking-application">
                <div className="tracking-application-header">
                  <span className="tracking-application-title">
                    Scholarship &middot; {application.scholarshipName}
                  </span>
                  <span className="tracking-application-meta">
                    Submitted {formatDate(application.submittedAt)}
                  </span>
                </div>
                <WorkflowStepper steps={application.steps} labels={SCHOLARSHIP_STEP_LABELS} />
              </div>
            ))}
          </>
        )}
      </Card>

      {!isLoading && !errorMessage && tracking?.documents && (
        <Card>
          <h2>Document Status</h2>
          <ul className="tracking-documents-list">
            {tracking.documents.requirements.map((requirement) => (
              <li key={requirement.documentType}>
                <div className="tracking-documents-header">
                  <span className="tracking-documents-type">
                    {DOCUMENT_TYPE_LABELS[requirement.documentType] ?? requirement.documentType}
                  </span>
                  <StatusBadge status={requirement.status === "NotSubmitted" ? "NotUploaded" : requirement.status} />
                </div>
                {requirement.status === "Flagged" && requirement.flaggedReason && (
                  <p className="tracking-documents-reason">Reason: {requirement.flaggedReason}</p>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </AppLayout>
  );
}
