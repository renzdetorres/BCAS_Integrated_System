// What each application status means, in the words staff see. Used by the
// "?" status guide and as the hover hint on a status badge.

export const ADMISSION_STATUSES = [
  { value: "Submitted", description: "Received. Set automatically when the applicant submits." },
  { value: "UnderReview", description: "Staff are reviewing the application." },
  { value: "PendingDocuments", description: "Waiting for the applicant's required documents." },
  { value: "DocumentsCompleted", description: "Every required document has been uploaded." },
  { value: "DocumentsCleared", description: "Every required document has been verified." },
  { value: "ExamScheduled", description: "The applicant has an entrance exam schedule." },
  { value: "ExamDone", description: "The applicant took the entrance exam." },
  { value: "DidNotTakeExam", description: "The applicant missed the exam. They can be scheduled again." },
  { value: "Registration", description: "Passed the exam and is registering." },
  { value: "Approved", description: "Accepted. The applicant can reserve a slot." },
  { value: "Rejected", description: "Not accepted. Final." },
  { value: "Retracted", description: "Withdrawn by the applicant or the school. Final." },
];

export const SCHOLARSHIP_STATUSES = [
  { value: "Submitted", description: "Received. Waiting for staff to pick it up." },
  { value: "Waitlisted", description: "The scholarship is full. Moves up automatically if a slot opens." },
  { value: "DocumentsVerified", description: "Required documents are checked and complete." },
  { value: "EligibilityScreening", description: "The evaluator is checking the eligibility rules." },
  { value: "Evaluation", description: "Interview, written exam and essay are being scored." },
  { value: "Result", description: "Screening is finished. Waiting for the Academic Head's decision." },
  { value: "Approved", description: "Scholarship granted." },
  { value: "Rejected", description: "Scholarship not granted." },
];

const ALL = [...ADMISSION_STATUSES, ...SCHOLARSHIP_STATUSES];

export function statusDescription(value) {
  return ALL.find((s) => s.value === value)?.description;
}
