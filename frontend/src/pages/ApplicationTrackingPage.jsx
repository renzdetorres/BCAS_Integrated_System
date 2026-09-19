import { useEffect, useState } from "react";
import { FileText, Award } from "lucide-react";
import AppShell from "../components/layout/AppShell.jsx";
import Card from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import Stepper from "../components/ui/Stepper.jsx";
import { getMyApplicationTracking } from "../api/applicationTrackingApi.js";
import { ApiError } from "../api/apiClient.js";

const ADMISSION_STEPS = {
  Submitted: { label: "Submitted", description: "Your application has been received." },
  DocumentsReceived: { label: "Documents Received", description: "Your submitted documents are on file." },
  UnderReview: { label: "Under Review", description: "The registrar is reviewing your application." },
  ExamScheduled: { label: "Exam Scheduled", description: "An entrance exam schedule has been assigned." },
  ExamCompleted: { label: "Exam Completed", description: "Your entrance exam has been recorded." },
  DecisionReleased: { label: "Decision Released", description: "A final decision has been made on your application." },
};

const SCHOLARSHIP_STEPS = {
  Submitted: { label: "Submitted", description: "Your application has been received." },
  DocumentsVerified: { label: "Documents Verified", description: "Your supporting documents have been verified." },
  EligibilityScreening: { label: "Eligibility Screening", description: "An evaluator is checking your eligibility." },
  Evaluation: { label: "Evaluation", description: "Your application is being evaluated for award." },
  Result: { label: "Result", description: "A final result has been released." },
};

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function toStepperSteps(steps, labelMap) {
  return steps.map((step) => ({
    name: labelMap[step.step]?.label ?? step.step,
    description: labelMap[step.step]?.description,
    state: step.isComplete ? "done" : step.isCurrent ? "current" : "upcoming",
  }));
}

function ApplicationCard({ icon: Icon, title, refLine, status, steps, submittedAt }) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest/10 text-forest">
          <Icon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-400">{refLine}</p>
          <p className="text-xs text-slate-400">Submitted {formatDate(submittedAt)}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="mt-6">
        <Stepper steps={steps} />
      </div>
    </Card>
  );
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

  const hasNoApplications =
    tracking && tracking.admissionApplications.length === 0 && tracking.scholarshipApplications.length === 0;

  return (
    <AppShell>
      <h1 className="text-2xl font-extrabold text-slate-900">Application Status</h1>
      <p className="mt-1 text-sm text-slate-500">
        Track the progress of your admission and scholarship applications.
      </p>

      {isLoading && <p className="mt-6 text-sm text-slate-400">Loading...</p>}

      {!isLoading && errorMessage && (
        <p className="mt-6 text-sm font-medium text-status-red" role="alert">
          {errorMessage}
        </p>
      )}

      {!isLoading && !errorMessage && hasNoApplications && (
        <p className="mt-6 text-sm text-slate-400">You haven't submitted any applications yet.</p>
      )}

      {!isLoading && !errorMessage && tracking && !hasNoApplications && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {tracking.admissionApplications.map((application) => (
            <ApplicationCard
              key={application.applicationId}
              icon={FileText}
              title="Admission Application"
              refLine={`Ref #${application.applicationId.slice(0, 8).toUpperCase()} · ${application.courseAppliedFor}`}
              status={application.status}
              submittedAt={application.submittedAt}
              steps={toStepperSteps(application.steps, ADMISSION_STEPS)}
            />
          ))}

          {tracking.scholarshipApplications.map((application) => (
            <ApplicationCard
              key={application.applicationId}
              icon={Award}
              title="Scholarship Application"
              refLine={`Ref #${application.applicationId.slice(0, 8).toUpperCase()} · ${application.scholarshipName}`}
              status={application.status}
              submittedAt={application.submittedAt}
              steps={toStepperSteps(application.steps, SCHOLARSHIP_STEPS)}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
