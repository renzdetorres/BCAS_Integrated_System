import { programOptionLabel, programsFor } from "../config/departments.js";
import "./EntranceFormView.css";

const DASH = "\u2014";
const dateText = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : DASH;

/** The school's "Application Form for Entrance Exam", laid out the way staff read the paper one. */
export default function EntranceFormView({ data }) {
  const f = data.form;

  if (!data.hasFormDetails) {
    return (
      <p className="entrance-form-empty">
        This application was filed before the entrance exam form was added, so only the basic details above were recorded.
      </p>
    );
  }

  const programLabel =
    programsFor(data.department)
      ?.map((p) => (p.code === data.courseAppliedFor ? programOptionLabel(p) : null))
      .find(Boolean) ?? data.courseAppliedFor;
  const rows = [
    ["Date", dateText(data.submittedAt)],
    ["Name", data.applicantName],
    ["Sex", f.sex],
    ["Date of birth", dateText(data.birthDate)],
    ["Place of birth", f.placeOfBirth],
    ["Address", data.address],
    ["Mobile no.", data.contactNumber],
    ["Level applied for", [data.department, programLabel, f.yearLevel, f.academicTerm].filter(Boolean).join(" \u00b7 ")],
    ["Academic year", f.academicYear],
    ["School last attended", data.previousSchool],
    ["School address", f.previousSchoolAddress],
    ["Special skills", f.specialSkills],
  ];

  return (
    <div className="entrance-form">
      <dl className="entrance-form-fields">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value || DASH}</dd>
          </div>
        ))}
      </dl>

      <table className="entrance-form-table">
        <thead>
          <tr>
            <th scope="col"> </th>
            <th scope="col">Name</th>
            <th scope="col">Occupation</th>
            <th scope="col">Mobile no.</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["Father", f.father],
            ["Mother", f.mother?.name && f.motherMaidenName ? { ...f.mother, name: `${f.mother.name} (maiden name ${f.motherMaidenName})` } : f.mother],
            ["Guardian", f.guardian],
          ].map(([label, m]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              <td>{m?.name || DASH}</td>
              <td>{m?.occupation || DASH}</td>
              <td>{m?.phone || DASH}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="entrance-form-signatures">
        <div>
          <span className="entrance-form-signature">{f.studentSignature}</span>
          <span className="entrance-form-caption">Student's signature over printed name</span>
        </div>
        <div>
          <span className="entrance-form-signature">{f.guardianSignature}</span>
          <span className="entrance-form-caption">Parent's / guardian's signature over printed name</span>
        </div>
      </div>
    </div>
  );
}
