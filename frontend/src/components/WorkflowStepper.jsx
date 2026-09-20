import "./WorkflowStepper.css";

export const ADMISSION_STEP_LABELS = {
  Submitted: "Submitted",
  DocumentsReceived: "Documents Received",
  UnderReview: "Under Review",
  ExamScheduled: "Exam Scheduled",
  ExamCompleted: "Exam Completed",
  DecisionReleased: "Decision Released",
};

export const SCHOLARSHIP_STEP_LABELS = {
  Submitted: "Submitted",
  DocumentsVerified: "Documents Verified",
  EligibilityScreening: "Eligibility Screening",
  Evaluation: "Evaluation",
  Result: "Result",
};

// A workflow step-pill row (BISAASS-22), shared by ApplicationTrackingPage
// (an applicant's own applications) and AdminApplicationDetailPage (any
// application, BISAASS-31) so the two never drift apart.
export default function WorkflowStepper({ steps, labels }) {
  return (
    <ol className="tracking-stepper">
      {steps.map((step) => (
        <li
          key={step.step}
          className={
            "tracking-step" +
            (step.isComplete ? " tracking-step-complete" : "") +
            (step.isCurrent ? " tracking-step-current" : "")
          }
        >
          <span className="tracking-step-dot" aria-hidden="true" />
          <span className="tracking-step-label">{labels[step.step] ?? step.step}</span>
        </li>
      ))}
    </ol>
  );
}
