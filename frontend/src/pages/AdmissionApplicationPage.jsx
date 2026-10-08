import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  APPLICATION_TYPES,
  getMyAdmissionApplications,
  submitAdmissionApplication,
} from "../api/admissionApi.js";
import { getMyProfile } from "../api/profileApi.js";
import { ApiError } from "../api/apiClient.js";
import { DEPARTMENT_OPTIONS, programOptionLabel, programsFor } from "../config/departments.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import ConfirmSubmissionModal from "../components/ConfirmSubmissionModal.jsx";
import { REQUIRED_NOTE, requiredDocumentsFor } from "../config/requiredDocuments.js";
import "./AdmissionApplicationPage.css";

const MAX_SIBLINGS = 10;
const emptyMember = { name: "", occupation: "", phone: "" };
const emptySibling = { name: "", age: "", occupation: "", schoolOrWork: "" };

const initialForm = {
  applicationType: APPLICATION_TYPES[0].value,
  department: "",
  courseAppliedFor: "",
  previousSchool: "",
  previousSchoolAddress: "",
  sex: "",
  placeOfBirth: "",
  specialSkills: "",
  father: { ...emptyMember },
  mother: { ...emptyMember },
  guardian: { ...emptyMember },
  siblings: [],
  studentSignature: "",
  guardianSignature: "",
};

const FAMILY_ROWS = [
  { key: "father", label: "Father" },
  { key: "mother", label: "Mother" },
  { key: "guardian", label: "Guardian" },
];

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** A submitted application, flattened back into the shape the form edits. */
function formFromApplication(application) {
  const f = application.form ?? {};
  const member = (m) => ({ name: m?.name ?? "", occupation: m?.occupation ?? "", phone: m?.phone ?? "" });
  return {
    applicationType: application.applicationType,
    department: application.department ?? "",
    courseAppliedFor: application.courseAppliedFor,
    previousSchool: application.previousSchool,
    previousSchoolAddress: f.previousSchoolAddress ?? "",
    sex: f.sex ?? "",
    placeOfBirth: f.placeOfBirth ?? "",
    specialSkills: f.specialSkills ?? "",
    father: member(f.father),
    mother: member(f.mother),
    guardian: member(f.guardian),
    siblings: (f.siblings ?? []).map((s) => ({
      name: s.name ?? "",
      age: s.age ?? "",
      occupation: s.occupation ?? "",
      schoolOrWork: s.schoolOrWork ?? "",
    })),
    studentSignature: f.studentSignature ?? "",
    guardianSignature: f.guardianSignature ?? "",
  };
}

export default function AdmissionApplicationPage() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [errorMessage, setErrorMessage] = useState(null);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getMyAdmissionApplications(), getMyProfile().catch(() => null)])
      .then(([applicationData, profileData]) => {
        if (cancelled) return;
        setApplications(applicationData);
        setProfile(profileData);
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof ApiError ? error.message : "Failed to load applications.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    // The course choices depend on the department, so changing it clears
    // a course picked for the previous one.
    setForm((prev) => ({ ...prev, [name]: value, ...(name === "department" ? { courseAppliedFor: "" } : {}) }));
  }

  function handleMemberChange(memberKey, field, value) {
    setForm((prev) => ({ ...prev, [memberKey]: { ...prev[memberKey], [field]: value } }));
  }

  function handleSiblingChange(index, field, value) {
    setForm((prev) => ({
      ...prev,
      siblings: prev.siblings.map((sibling, i) => (i === index ? { ...sibling, [field]: value } : sibling)),
    }));
  }

  function addSibling() {
    setForm((prev) => (prev.siblings.length >= MAX_SIBLINGS ? prev : { ...prev, siblings: [...prev.siblings, { ...emptySibling }] }));
  }

  function removeSibling(index) {
    setForm((prev) => ({ ...prev, siblings: prev.siblings.filter((_, i) => i !== index) }));
  }

  // A department with a fixed program list (College) picks from it; any
  // other takes its strand or grade level as typed.
  const programs = programsFor(form.department);

  function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    setProfileIncomplete(false);

    const problem = firstProblem();
    if (problem) {
      setErrorMessage(problem);
      return;
    }

    setConfirming(true);
  }

  function firstProblem() {
    if (!form.department) return "Choose the department you are applying to.";
    if (programs && !form.courseAppliedFor) return `Choose a program for the ${form.department} department.`;
    if (!form.courseAppliedFor.trim()) return "Enter the strand or grade level you are applying for.";
    if (!form.sex) return "Choose the student's sex.";
    if (!form.placeOfBirth.trim()) return "Enter the student's place of birth.";
    if (!form.previousSchool.trim()) return "Enter your previous school.";
    if (!form.previousSchoolAddress.trim()) return "Enter the address of your previous school.";
    const reachable = FAMILY_ROWS.some(({ key }) => form[key].name.trim() && form[key].phone.trim());
    if (!reachable) return "Give the name and phone number of at least one parent or guardian.";
    if (form.siblings.some((s) => !s.name.trim() && (s.age !== "" || s.occupation.trim() || s.schoolOrWork.trim()))) {
      return "Every brother or sister listed needs a name.";
    }
    if (!form.studentSignature.trim()) return "Type the student's name as the student's signature.";
    if (!form.guardianSignature.trim()) return "Type a parent's or guardian's name as their signature.";
    return null;
  }

  async function sendApplication() {
    setIsSubmitting(true);

    try {
      const created = await submitAdmissionApplication(form);
      navigate(`/applications/receipt/${created.applicationId}`);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
        setProfileIncomplete(error.message.toLowerCase().includes("profile"));
      } else {
        setErrorMessage("Something went wrong. Please try again.");
      }
      setConfirming(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  // One admission application per applicant: once it exists the form stays on
  // screen, greyed out and read-only, showing what was submitted.
  const submitted = applications[0] ?? null;
  const readOnly = Boolean(submitted);
  const values = submitted ? formFromApplication(submitted) : form;
  const shownPrograms = programsFor(values.department);
  const requiredDocuments = requiredDocumentsFor(values.applicationType);
  const formDate = submitted ? formatDate(submitted.submittedAt) : formatDate(new Date().toISOString());
  const studentName = profile ? `${profile.firstName} ${profile.lastName}` : "";
  const studentAddress = profile ? [profile.addressLine, profile.city, profile.province, profile.postalCode].filter(Boolean).join(", ") : "";

  return (
    <AppLayout title="My Application">
      <Card className={`admission-card${readOnly ? " admission-card-submitted" : ""}`}>
        <h2>{readOnly ? "Your Application Form for Entrance Exam" : "Application Form for Entrance Exam"}</h2>

        {readOnly && (
          <div className="admission-submitted-note" role="status">
            <div className="admission-submitted-head">
              <StatusBadge status={submitted.status} />
              <span>Submitted {formatDate(submitted.submittedAt)}</span>
            </div>
            <p>
              Your application has been submitted and can no longer be edited or sent again. Next, follow its progress under{" "}
              <Link to="/application-tracking">Application Tracking</Link>, upload your <Link to="/documents">documents</Link>, and
              watch <Link to="/announcements">Announcements</Link> for your exam schedule.
            </p>
          </div>
        )}

        {isLoading && <p>Loading...</p>}

        {errorMessage && (
          <p className="form-error" role="alert">
            {errorMessage}
            {profileIncomplete && (
              <>
                {" "}
                <Link to="/profile">Complete your profile</Link>.
              </>
            )}
          </p>
        )}

        {!isLoading && (
          <form onSubmit={handleSubmit} noValidate className={readOnly ? "form-readonly" : undefined}>
            <fieldset disabled={readOnly || isSubmitting} className="form-fieldset">
              <h3 className="form-section-title">Student</h3>
              <dl className="form-profile">
                <div>
                  <dt>Date</dt>
                  <dd>{formDate}</dd>
                </div>
                <div>
                  <dt>Name</dt>
                  <dd>{studentName || "—"}</dd>
                </div>
                <div>
                  <dt>Date of birth</dt>
                  <dd>{profile?.birthDate ? formatDate(profile.birthDate) : "—"}</dd>
                </div>
                <div>
                  <dt>Contact no.</dt>
                  <dd>{profile?.contactNumber || "—"}</dd>
                </div>
                <div className="form-profile-wide">
                  <dt>Address</dt>
                  <dd>{studentAddress || "—"}</dd>
                </div>
              </dl>
              {!readOnly && (
                <p className="form-note">
                  {profile ? (
                    <>
                      Your name, date of birth, address and contact number come from your profile.{" "}
                      <Link to="/profile">Update your profile</Link> if anything is wrong.
                    </>
                  ) : (
                    <>
                      <Link to="/profile">Complete your profile</Link> first. Your name, date of birth, address and contact number
                      are taken from it.
                    </>
                  )}
                </p>
              )}

              <div className="form-grid">
                <div className="form-row">
                  <label htmlFor="sex">Sex</label>
                  <select id="sex" name="sex" required value={values.sex} onChange={handleChange}>
                    <option value="" disabled>
                      Select
                    </option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="form-row">
                  <label htmlFor="placeOfBirth">Place of birth</label>
                  <input id="placeOfBirth" name="placeOfBirth" type="text" maxLength={200} required value={values.placeOfBirth} onChange={handleChange} />
                </div>
              </div>
              <div className="form-row">
                <label htmlFor="specialSkills">Special skills (optional)</label>
                <input id="specialSkills" name="specialSkills" type="text" maxLength={300} value={values.specialSkills} onChange={handleChange} />
              </div>

              <h3 className="form-section-title">Level applied for</h3>
              <div className="form-row">
                <label htmlFor="applicationType">Application type</label>
                <select id="applicationType" name="applicationType" value={values.applicationType} onChange={handleChange}>
                  {APPLICATION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-grid">
                <div className="form-row">
                  <label htmlFor="department">Department</label>
                  <select id="department" name="department" required value={values.department ?? ""} onChange={handleChange}>
                    <option value="" disabled>
                      Select a department
                    </option>
                    {DEPARTMENT_OPTIONS.map((department) => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <label htmlFor="courseAppliedFor">{shownPrograms ? "Program" : "Strand or grade level"}</label>
                  {shownPrograms ? (
                    <select id="courseAppliedFor" name="courseAppliedFor" required value={values.courseAppliedFor} onChange={handleChange}>
                      <option value="" disabled>
                        Select a program
                      </option>
                      {shownPrograms.map((program) => (
                        <option key={program.code} value={program.code}>
                          {programOptionLabel(program)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="courseAppliedFor"
                      name="courseAppliedFor"
                      type="text"
                      required
                      placeholder={values.department ? "For example: STEM, Grade 7" : "Choose a department first"}
                      disabled={!values.department}
                      value={values.courseAppliedFor}
                      onChange={handleChange}
                    />
                  )}
                </div>
              </div>

              <h3 className="form-section-title">School last attended</h3>
              <div className="form-row">
                <label htmlFor="previousSchool">School name</label>
                <input id="previousSchool" name="previousSchool" type="text" required value={values.previousSchool} onChange={handleChange} />
              </div>
              <div className="form-row">
                <label htmlFor="previousSchoolAddress">School address</label>
                <input id="previousSchoolAddress" name="previousSchoolAddress" type="text" maxLength={300} required value={values.previousSchoolAddress} onChange={handleChange} />
              </div>

              <h3 className="form-section-title">Parents and guardian</h3>
              <div className="form-table-wrap">
                <table className="family-table">
                  <thead>
                    <tr>
                      <th scope="col"> </th>
                      <th scope="col">Name</th>
                      <th scope="col">Occupation</th>
                      <th scope="col">Phone no.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FAMILY_ROWS.map(({ key, label }) => (
                      <tr key={key}>
                        <th scope="row">{label}</th>
                        {["name", "occupation", "phone"].map((field) => (
                          <td key={field}>
                            <input
                              type={field === "phone" ? "tel" : "text"}
                              aria-label={`${label} ${field}`}
                              maxLength={field === "name" ? 200 : field === "phone" ? 50 : 100}
                              value={values[key][field]}
                              onChange={(event) => handleMemberChange(key, field, event.target.value)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!readOnly && <p className="form-note">Give the name and phone number of at least one of them.</p>}

              <h3 className="form-section-title">Brothers and sisters</h3>
              {values.siblings.length === 0 && readOnly ? <p className="form-note">None listed.</p> : null}
              {values.siblings.length > 0 && (
                <div className="form-table-wrap">
                  <table className="family-table">
                    <thead>
                      <tr>
                        <th scope="col">Name</th>
                        <th scope="col" className="family-age">
                          Age
                        </th>
                        <th scope="col">Occupation</th>
                        <th scope="col">School / place of work</th>
                        {!readOnly && <th scope="col" aria-label="Remove" />}
                      </tr>
                    </thead>
                    <tbody>
                      {values.siblings.map((sibling, index) => (
                        <tr key={index}>
                          <td>
                            <input type="text" aria-label={`Sibling ${index + 1} name`} maxLength={200} value={sibling.name} onChange={(e) => handleSiblingChange(index, "name", e.target.value)} />
                          </td>
                          <td className="family-age">
                            <input type="number" min="0" max="120" aria-label={`Sibling ${index + 1} age`} value={sibling.age} onChange={(e) => handleSiblingChange(index, "age", e.target.value)} />
                          </td>
                          <td>
                            <input type="text" aria-label={`Sibling ${index + 1} occupation`} maxLength={100} value={sibling.occupation} onChange={(e) => handleSiblingChange(index, "occupation", e.target.value)} />
                          </td>
                          <td>
                            <input type="text" aria-label={`Sibling ${index + 1} school or place of work`} maxLength={200} value={sibling.schoolOrWork} onChange={(e) => handleSiblingChange(index, "schoolOrWork", e.target.value)} />
                          </td>
                          {!readOnly && (
                            <td>
                              <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeSibling(index)} aria-label={`Remove sibling ${index + 1}`}>
                                Remove
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {!readOnly && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={addSibling} disabled={values.siblings.length >= MAX_SIBLINGS}>
                  Add a brother or sister
                </button>
              )}

              <h3 className="form-section-title">Signatures</h3>
              <div className="form-grid">
                <div className="form-row">
                  <label htmlFor="studentSignature">Student's signature over printed name</label>
                  <input id="studentSignature" name="studentSignature" type="text" maxLength={200} required className="signature-input" value={values.studentSignature} onChange={handleChange} />
                </div>
                <div className="form-row">
                  <label htmlFor="guardianSignature">Parent's / guardian's signature over printed name</label>
                  <input id="guardianSignature" name="guardianSignature" type="text" maxLength={200} required className="signature-input" value={values.guardianSignature} onChange={handleChange} />
                </div>
              </div>
              {!readOnly && <p className="form-note">Type the full name of each person. Typing it counts as their signature.</p>}
            </fieldset>

            {!readOnly && (
              <>
                <div className="form-guidance">
                  <p className="form-guidance-title">Documents you will need</p>
                  <ul className="required-docs">
                    {requiredDocuments.map((doc) => (
                      <li key={doc.type}>
                        {doc.label}
                        {doc.required ? <span className="required-mark" title="Required"> *</span> : <em> ({doc.note})</em>}
                      </li>
                    ))}
                  </ul>
                  <p className="form-note">{REQUIRED_NOTE} You upload them on the Documents page after submitting.</p>
                </div>

                <button type="submit" disabled={isSubmitting}>
                  Submit Application
                </button>
              </>
            )}
          </form>
        )}
      </Card>

      <ConfirmSubmissionModal
        open={confirming}
        onCancel={() => setConfirming(false)}
        onConfirm={sendApplication}
        isSubmitting={isSubmitting}
      />
    </AppLayout>
  );
}
