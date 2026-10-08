import Icon from "./Icon.jsx";
import "./StatusBadge.css";

// Maps every real status/verdict/flag value used across the system
// (AdmissionApplications.Status, ScholarshipApplications.Status,
// ApplicantDocuments.Status, ExamRescheduleRequests.Status,
// ScholarshipEligibilityScreenings.Verdict, ScholarshipFinalDecisions.Decision,
// Announcements/Scholarships/Users.IsActive) to one of five tones.
const TONE_BY_VALUE = {
  Approved: "green",
  Verified: "green",
  Qualified: "green",
  Eligible: "green",
  Active: "green",
  Published: "green",
  Reserved: "green",

  Rejected: "red",
  Flagged: "red",
  NotQualified: "red",
  NotEligible: "red",

  Pending: "amber",
  Submitted: "amber",
  Waitlisted: "amber",
  DocumentsVerified: "amber",
  EligibilityScreening: "amber",
  Evaluation: "amber",
  Result: "amber",
  Draft: "amber",
  Open: "amber",

  NotUploaded: "gray",
  Inactive: "gray",
  Closed: "gray",

  UnderReview: "amber",

  PendingDocuments: "amber",
  DocumentsCompleted: "amber",
  DocumentsCleared: "green",
  ExamScheduled: "amber",
  ExamDone: "green",
  Registration: "amber",
  Retracted: "gray",
  DidNotTakeExam: "red",
};

const LABEL_OVERRIDES = {
  UnderReview: "Under Review",
  PendingDocuments: "Pending Documents",
  DocumentsCompleted: "Documents Completed",
  DocumentsCleared: "Documents Cleared",
  ExamScheduled: "Exam Scheduled",
  ExamDone: "Exam Done",
  DidNotTakeExam: "Did Not Take Exam",
  DocumentsVerified: "Documents Verified",
  EligibilityScreening: "Eligibility Screening",
  NotQualified: "Not Qualified",
  NotUploaded: "Not Uploaded",
  NotEligible: "Not Eligible",
};

// One icon per tone, not per status value - the tone already carries the
// meaning (approved/pending/rejected/inactive/under-review), so the icon
// reinforces that same signal for a quick scan rather than illustrating
// each of the ~20 status strings individually.
const ICON_BY_TONE = {
  green: "check",
  amber: "clock",
  red: "x",
  gray: "dash",
  purple: "eye",
};

export function statusLabel(status) {
  return LABEL_OVERRIDES[status] ?? status;
}

export function statusTone(status, adminContext = false) {
  return adminContext && status === "UnderReview" ? "purple" : TONE_BY_VALUE[status] ?? "gray";
}

/**
 * Status pill using only the five palette tones (green/red/amber/gray/purple).
 * `adminContext` renders "UnderReview" as purple instead of amber, per the
 * design spec's distinction between an applicant's own view of their pending
 * application and staff actively reviewing it.
 */
export default function StatusBadge({ status, adminContext = false, label, hint }) {
  const tone = statusTone(status, adminContext);
  const text = label ?? statusLabel(status);

  return (
    <span className={`status-badge status-badge-${tone}`} title={hint}>
      <Icon name={ICON_BY_TONE[tone]} size={11} className="status-badge-icon" />
      {text}
    </span>
  );
}
