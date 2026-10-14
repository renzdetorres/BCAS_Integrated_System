import { APPLICATION_TYPE_LABELS } from "../../api/admissionApi.js";
import { categoryFor } from "../../config/academicStructure.js";
import { programOptionLabel, programsFor } from "../../config/departments.js";
import { formatCalendarDate } from "../../utils/format.js";
import "./ApplicationSummary.css";

const DASH = "—";

function programLabel(department, code) {
  const program = programsFor(department)?.find((p) => p.code === code);
  return program ? programOptionLabel(program) : code;
}

function Section({ title, onEdit, children }) {
  return (
    <section className="summary-section">
      <div className="summary-section-head">
        <h3>{title}</h3>
        {onEdit ? (
          <button type="button" className="summary-edit" onClick={onEdit}>
            Edit
          </button>
        ) : null}
      </div>
      <dl className="summary-list">{children}</dl>
    </section>
  );
}

function Row({ label, children, wide = false }) {
  return (
    <div className={wide ? "summary-row summary-row-wide" : "summary-row"}>
      <dt>{label}</dt>
      <dd>{children || DASH}</dd>
    </div>
  );
}

function Person({ label, person, extra }) {
  const filled = person.name || person.phone || person.occupation;
  if (!filled) return <Row label={label}>{DASH}</Row>;
  return (
    <Row label={label} wide>
      {[person.name, extra, person.occupation, person.phone].filter(Boolean).join(" · ")}
    </Row>
  );
}

/**
 * Everything the applicant has entered, laid out for a last read-through
 * before they submit, and reused as the record of a submitted application.
 * `files` maps a document type to the chosen File (before submission) and is
 * left out once the application is in. `onEdit(stepIndex)` adds Edit links.
 */
export default function ApplicationSummary({ values, profile, requiredDocuments, files, onEdit }) {
  const category = categoryFor(values.department);
  const studentName = profile ? `${profile.firstName} ${profile.lastName}` : "";
  const address = profile ? [profile.addressLine, profile.city, profile.province, profile.postalCode].filter(Boolean).join(", ") : "";
  const edit = (index) => (onEdit ? () => onEdit(index) : undefined);

  return (
    <div className="application-summary">
      <Section title="Personal information" onEdit={edit(0)}>
        <Row label="Full name">{studentName}</Row>
        <Row label="Date of birth">{profile?.birthDate ? formatCalendarDate(profile.birthDate) : ""}</Row>
        <Row label="Sex">{values.sex}</Row>
        <Row label="Place of birth">{values.placeOfBirth}</Row>
        <Row label="Mobile number">{profile?.contactNumber}</Row>
        <Row label="Address" wide>
          {address}
        </Row>
        {values.specialSkills ? <Row label="Special skills" wide>{values.specialSkills}</Row> : null}
        <Person label="Father" person={values.father} />
        <Person label="Mother" person={values.mother} extra={values.motherMaidenName ? `maiden name ${values.motherMaidenName}` : ""} />
        <Person label="Guardian" person={values.guardian} />
      </Section>

      <Section title="Academic information" onEdit={edit(1)}>
        <Row label="Academic category">{values.department}</Row>
        {category?.hasStrand ? <Row label="Strand">{values.courseAppliedFor}</Row> : null}
        {values.department === "College" ? <Row label="Program">{programLabel("College", values.courseAppliedFor)}</Row> : null}
        <Row label={category?.yearLevelLabel ?? "Level"}>{values.yearLevel}</Row>
        {category?.terms ? <Row label={category.termLabel}>{values.academicTerm}</Row> : null}
        <Row label="School last attended">{values.previousSchool}</Row>
        <Row label="School address" wide>
          {values.previousSchoolAddress}
        </Row>
      </Section>

      <Section title="Application type" onEdit={edit(2)}>
        <Row label="Type">{APPLICATION_TYPE_LABELS[values.applicationType] ?? values.applicationType}</Row>
      </Section>

      {requiredDocuments ? (
        <Section title="Documents" onEdit={edit(3)}>
          {requiredDocuments.map((doc) => {
            const file = files?.[doc.type];
            return (
              <Row key={doc.type} label={doc.label} wide>
                {file ? file.name : doc.required ? "Not attached" : "Submitted after the exam"}
              </Row>
            );
          })}
        </Section>
      ) : null}
    </div>
  );
}
