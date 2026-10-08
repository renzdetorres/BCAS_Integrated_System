// Which documents applicants must provide. Everything on a checklist except SF10
// is required; SF10 is only asked for after the entrance exam.

export const REQUIRED_NOTE = "* Required.";

const BASE = [
  { type: "ReportCard", label: "Report Card", required: true },
  { type: "IdPicture", label: "2x2 ID Picture", required: true },
  { type: "PSA", label: "PSA Birth Certificate", required: true },
];

const TRANSCRIPT = { type: "TOR", label: "Transcript of Records (TOR)", required: true };
const SF10 = { type: "SF10", label: "SF10 (Permanent Record)", required: false, note: "submitted after the exam" };

export function requiredDocumentsFor(applicationType) {
  return applicationType === "Transferee" ? [...BASE, TRANSCRIPT, SF10] : [...BASE, SF10];
}

/** Whether a document type on the checklist is required (everything but SF10). */
export function isRequiredDocument(documentType) {
  return documentType !== "SF10";
}
