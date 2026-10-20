import "./WorkflowStepper.css";

// The seven stages an applicant sees on the admission tracker. Document
// verification, payment verification, exam scheduling, the exam itself,
// interview and result processing are sub-processes shown beneath the
// tracker, never stages of their own.
export const ADMISSION_STEP_LABELS = {
  Submitted: "Submitted",
  UnderReview: "Under Review",
  ExamPayment: "Payment for Entrance Exam",
  ExamPermit: "Exam Permit",
  ExamResult: "Exam Result",
  InterviewSchedule: "Interview Schedule",
  Enrollment: "Enrollment",
};

export const SCHOLARSHIP_STEP_LABELS = {
  // The six stages an applicant sees (the rest are the staff workflow's own steps).
  Application: "Application",
  ScholarshipExam: "Scholarship Exam",
  ExamResult: "Exam Result",
  InterviewEssay: "Interview / Essay",
  ScholarshipResult: "Scholarship Result",
  Submitted: "Submitted",
  DocumentsVerified: "Documents Verified",
  EligibilityScreening: "Eligibility Screening",
  Evaluation: "Evaluation",
  Result: "Result",
};

// One plain sentence under the stage an applicant is on now, so the tracker says what is
// happening and not only where they are.
export const ADMISSION_STEP_HINTS = {
  Submitted: "We received your application.",
  UnderReview: "Staff are checking your details and documents.",
  ExamPayment: "Pay the exam fee, then upload your proof of payment.",
  ExamPermit: "Choose your exam schedule to get your permit.",
  ExamResult: "Your exam is being scored. The result will appear here.",
  InterviewSchedule: "Your interview is being arranged.",
  Enrollment: "Complete your enrollment with the registrar.",
};

export const SCHOLARSHIP_STEP_HINTS = {
  Application: "We received your scholarship application.",
  ScholarshipExam: "Take the scholarship exam on your schedule.",
  ExamResult: "Your exam result will appear here.",
  InterviewEssay: "Prepare for your interview and essay.",
  ScholarshipResult: "The committee is deciding. You will be notified.",
};

// What each stage reads as relative to where the applicant is: finished,
// the one they are on, the very next one, or one that cannot start yet.
function stageCaption(step, index, currentIndex) {
  if (step.isComplete) return "Completed";
  if (step.isCurrent) return "Current";
  if (currentIndex === -1) return "Locked";
  return index === currentIndex + 1 ? "Pending" : "Locked";
}

// A workflow step row (BISAASS-22), shared by ApplicationTrackingPage
// (an applicant's own applications), the applicant dashboard and
// AdminApplicationDetailPage (any application, BISAASS-31) so they never
// drift apart. `numbered` draws the circular 1-7 tracker used for
// admission; without it, the compact diamond rail used for scholarships.
export default function WorkflowStepper({ steps, labels, hints = null, numbered = false }) {
  const currentIndex = steps.findIndex((step) => step.isCurrent);

  return (
    <ol className={"tracking-stepper" + (numbered ? " tracking-stepper-numbered" : "")}>
      {steps.map((step, index) => {
        const caption = numbered ? stageCaption(step, index, currentIndex) : null;
        return (
          <li
            key={step.step}
            className={
              "tracking-step" +
              (step.isComplete ? " tracking-step-complete" : "") +
              (step.isCurrent ? " tracking-step-current" : "") +
              (caption === "Locked" ? " tracking-step-locked" : "")
            }
            aria-current={step.isCurrent ? "step" : undefined}
          >
            {numbered ? (
              <span className="tracking-step-circle" aria-hidden="true">
                {step.isComplete ? (
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m3.5 8.5 3 3 6-7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>
            ) : (
              <span className="tracking-step-dot" aria-hidden="true" />
            )}
            <span className="tracking-step-text">
              <span className="tracking-step-label">{labels[step.step] ?? step.step}</span>
              {caption && <span className="tracking-step-caption">{caption}</span>}
              {numbered && hints && step.isCurrent && !step.isComplete && hints[step.step] ? (
                <span className="tracking-step-hint">{hints[step.step]}</span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
