import { formatCalendarDate, formatPeso, formatTime } from "../utils/format.js";
import "./ExamSlip.css";

/**
 * The exam slip as a form: school header, then every field the registrar
 * prints on the paper slip. Used by the applicant's permit page and by the
 * admin's "View permit" dialog so both show the same document. The permit
 * number is a small reference in the header, not the headline.
 *
 * `released` false renders it as a preview: fee and invoice number are
 * filled in when the registrar releases the permit.
 */
export default function ExamSlip({ permit, released = true }) {
  const level = [permit.levelApplying, permit.program].filter(Boolean).join(" · ");
  const fields = [
    ["Type of exam", permit.examType],
    ["Name", permit.applicantName],
    ["School last attended", permit.schoolLastAttended],
    ["Level applying for", level],
    ["Date", formatCalendarDate(permit.examDate)],
    ["Time", formatTime(permit.examTime)],
    ["Venue", permit.venue],
    ["Exam fee", permit.examFee ? formatPeso(permit.examFee) : released ? "" : "Set at release"],
    ["Invoice (SI) no.", permit.invoiceNumber || (released ? "" : "Entered at release")],
  ];

  return (
    <article className="exam-slip" aria-label="Exam slip">
      <header className="exam-slip-header">
        <div>
          <p className="exam-slip-school">Batangas College of Arts and Sciences, Inc.</p>
          <h3 className="exam-slip-title">Exam Slip</h3>
        </div>
        <p className="exam-slip-ref">
          <span>Permit no.</span>
          {permit.permitNumber}
        </p>
      </header>
      <dl className="exam-slip-fields">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value || "—"}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
