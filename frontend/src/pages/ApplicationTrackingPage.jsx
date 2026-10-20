import { useCallback, useEffect, useRef, useState } from "react";
import { getMyApplicationTracking } from "../api/applicationTrackingApi.js";
import { DOCUMENT_TYPE_LABELS } from "../api/documentApi.js";
import { ApiError } from "../api/apiClient.js";
import WorkflowStepper, {
  ADMISSION_STEP_HINTS,
  ADMISSION_STEP_LABELS,
  SCHOLARSHIP_STEP_HINTS,
  SCHOLARSHIP_STEP_LABELS,
} from "../components/WorkflowStepper.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { usePolling } from "../hooks/usePolling.js";
import TrackerStatus from "../components/TrackerStatus.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import "./ApplicationTrackingPage.css";
import Skeleton from "../components/ui/Skeleton.jsx";

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// How often the page checks for a new status while it is open (and again whenever the tab is revisited).
const REFRESH_MS = 30000;

/** The stage each application is on, keyed by its id, so a change can be named. */
function currentStages(tracking) {
  const stages = new Map();
  const add = (application, labels) => {
    const current = application.steps.find((step) => step.isCurrent);
    stages.set(application.applicationId, current ? (labels[current.step] ?? current.step) : null);
  };
  tracking.admissionApplications.forEach((application) => add(application, ADMISSION_STEP_LABELS));
  tracking.scholarshipApplications.forEach((application) => add(application, SCHOLARSHIP_STEP_LABELS));
  return stages;
}

export default function ApplicationTrackingPage() {
  const { showToast } = useToast();
  const seenStages = useRef(null);
  const [tracking, setTracking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  // A quiet refresh: no skeleton, no reload. The page keeps what it has and only the parts that
  // changed move (the new stage lights up), with a toast to say so.
  const refresh = useCallback(() => {
    getMyApplicationTracking()
      .then((data) => {
        const next = currentStages(data);
        const before = seenStages.current;
        if (before) {
          for (const [id, stage] of next) {
            if (before.has(id) && before.get(id) !== stage && stage) showToast(`Your application moved to ${stage}.`);
          }
        }
        seenStages.current = next;
        setTracking(data);
      })
      .catch(() => {
        // A failed background check changes nothing on screen; the next one tries again.
      });
  }, [showToast]);

  usePolling(refresh, REFRESH_MS, !errorMessage);

  useEffect(() => {
    let cancelled = false;

    getMyApplicationTracking()
      .then((data) => {
        if (cancelled) return;
        seenStages.current = currentStages(data);
        setTracking(data);
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
        {isLoading && <Skeleton />}

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
                <WorkflowStepper steps={application.steps} labels={ADMISSION_STEP_LABELS} hints={ADMISSION_STEP_HINTS} numbered />
                <TrackerStatus steps={application.steps} subProcess={application.subProcess} nextAction={application.nextAction} nextActionPath={application.nextActionPath} />
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
                <WorkflowStepper steps={application.steps} labels={SCHOLARSHIP_STEP_LABELS} hints={SCHOLARSHIP_STEP_HINTS} numbered />
                <TrackerStatus
                  steps={application.steps}
                  labels={SCHOLARSHIP_STEP_LABELS}
                  subProcess={application.subProcess}
                  nextAction={application.nextAction}
                  nextActionPath={application.nextActionPath}
                />
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
