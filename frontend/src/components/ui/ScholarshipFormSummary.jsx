import { DEPARTMENT_FOR_LEVEL } from "../../config/scholarshipForm.js";
import { formatDateTime } from "../../utils/format.js";
import "./ScholarshipFormSummary.css";

function consentLabel(value) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "—";
}

/**
 * The answers an applicant gave on the scholarship application form, for staff
 * views. Applications filed before the form existed have no answers.
 */
export default function ScholarshipFormSummary({ form }) {
  if (!form || !form.levelApplied) {
    return <p className="sfs-empty">No application form answers were recorded for this application.</p>;
  }

  const rows = [
    ["Applicant", form.applicantFullName],
    ["Level applied", `${form.levelApplied} (${DEPARTMENT_FOR_LEVEL[form.levelApplied] ?? "—"})`],
    ["School last attended", form.schoolLastAttended],
    ["Guardian relationship", form.guardianRole],
    ["Parent / guardian", form.guardianName],
    ["Contact number", form.guardianContact],
    ["Email", form.guardianEmail],
    ["Agreed to consent terms", consentLabel(form.consentTerms)],
    ["Consent to participation", consentLabel(form.consentParticipation)],
    ["Certified information / data privacy", consentLabel(form.consentCertification)],
    ["Consent recorded", form.consentedAt ? formatDateTime(form.consentedAt) : "—"],
  ];

  return (
    <dl className="sfs-list">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
