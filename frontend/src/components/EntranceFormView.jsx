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
    ["Contact no.", data.contactNumber],
    ["Level applied for", [data.department, programLabel].filter(Boolean).join(" \u00b7 ")],
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
            <th scope="col">Phone no.</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["Father", f.father],
            ["Mother", f.mother],
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

      <p className="entrance-form-subtitle">Brothers and sisters</p>
      {f.siblings.length === 0 ? (
        <p className="entrance-form-empty">None listed.</p>
      ) : (
        <table className="entrance-form-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Age</th>
              <th scope="col">Occupation</th>
              <th scope="col">School / place of work</th>
            </tr>
          </thead>
          <tbody>
            {f.siblings.map((s, index) => (
              <tr key={index}>
                <td>{s.name || DASH}</td>
                <td>{s.age ?? DASH}</td>
                <td>{s.occupation || DASH}</td>
                <td>{s.schoolOrWork || DASH}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

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
