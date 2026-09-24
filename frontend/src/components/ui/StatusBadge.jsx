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
};

const LABEL_OVERRIDES = {
  UnderReview: "Under Review",
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

/**
 * Status pill using only the five palette tones (green/red/amber/gray/purple).
 * `adminContext` renders "UnderReview" as purple instead of amber, per the
 * design spec's distinction between an applicant's own view of their pending
 * application and staff actively reviewing it.
 */
export default function StatusBadge({ status, adminContext = false, label }) {
  const tone =
    adminContext && status === "UnderReview" ? "purple" : TONE_BY_VALUE[status] ?? "gray";
  const text = label ?? LABEL_OVERRIDES[status] ?? status;

  return (
    <span className={`status-badge status-badge-${tone}`}>
      <Icon name={ICON_BY_TONE[tone]} size={11} className="status-badge-icon" />
      {text}
    </span>
  );
}
