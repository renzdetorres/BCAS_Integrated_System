// Which documents applicants must provide, and the file format each one takes.
// Everything on a checklist except SF10 is required; SF10 is only asked for
// after the entrance exam. A Transcript of Records is only asked of a College
// transferee. Mirrored by DocumentConstants.cs on the server.

export const REQUIRED_NOTE = "* Required.";

export const PDF = ["PDF"];
export const IMAGE = ["JPG", "PNG"];

const BASE = [
  { type: "ReportCard", label: "Report Card", required: true, formats: PDF },
  { type: "IdPicture", label: "2x2 ID Picture", required: true, formats: IMAGE },
  { type: "PSA", label: "PSA Birth Certificate", required: true, formats: PDF },
];

const TRANSCRIPT = { type: "TOR", label: "Transcript of Records (TOR)", required: true, formats: PDF };
const SF10 = { type: "SF10", label: "SF10 (Permanent Record)", required: false, formats: PDF, note: "submitted after the exam" };

/** The checklist for an application type at an academic category (department). */
export function requiredDocumentsFor(applicationType, department) {
  const needsTranscript = applicationType === "Transferee" && (!department || department === "College");
  return needsTranscript ? [...BASE, TRANSCRIPT, SF10] : [...BASE, SF10];
}

/** Whether a document type on the checklist is required (everything but SF10). */
export function isRequiredDocument(documentType) {
  return documentType !== "SF10";
}

/** "PDF" or "JPG or PNG" - the format hint shown beside a document's name. */
export function formatsLabel(formats) {
  return formats.join(" or ");
}

export function formatsFor(documentType) {
  return documentType === "IdPicture" ? IMAGE : PDF;
}

const MIME_BY_FORMAT = { PDF: "application/pdf", JPG: "image/jpeg", PNG: "image/png" };
const EXTENSIONS_BY_FORMAT = { PDF: [".pdf"], JPG: [".jpg", ".jpeg"], PNG: [".png"] };

/** The `accept` attribute for a document's file picker. */
export function acceptFor(formats) {
  return formats.flatMap((f) => [...EXTENSIONS_BY_FORMAT[f], MIME_BY_FORMAT[f]]).join(",");
}

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** A message if the chosen file can't be used for this document, otherwise null. */
export function fileProblem(file, formats) {
  const name = file.name.toLowerCase();
  const matches = formats.some((f) => EXTENSIONS_BY_FORMAT[f].some((ext) => name.endsWith(ext)));
  if (!matches) return `This document must be a ${formatsLabel(formats)} file.`;
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_FILE_BYTES) return "Files must be 10 MB or smaller.";
  return null;
}
