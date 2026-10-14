import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  APPLICATION_TYPES,
  getMyAdmissionApplications,
  submitAdmissionApplication,
} from "../api/admissionApi.js";
import { uploadDocument } from "../api/documentApi.js";
import { getMyProfile } from "../api/profileApi.js";
import { getAdmissionConfig } from "../api/schoolConfigApi.js";
import { ApiError } from "../api/apiClient.js";
import { ACADEMIC_CATEGORIES, SENIOR_HIGH_STRANDS, ageProblem, categoryFor } from "../config/academicStructure.js";
import { programOptionLabel, programsFor } from "../config/departments.js";
import { REQUIRED_NOTE, acceptFor, fileProblem, formatsLabel, requiredDocumentsFor } from "../config/requiredDocuments.js";
import { PHONE_HINT, PHONE_PATTERN, cleanPhoneInput, isValidPhone } from "../utils/phone.js";
import { formatDate, formatFileSize } from "../utils/format.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import ConfirmSubmissionModal from "../components/ConfirmSubmissionModal.jsx";
import AdmissionStepper from "../components/admission/AdmissionStepper.jsx";
import ApplicationSummary from "../components/admission/ApplicationSummary.jsx";
import "./AdmissionApplicationPage.css";

const STEPS = [
  { id: "personal", label: "Personal Information" },
  { id: "academic", label: "Academic Information" },
  { id: "type", label: "Application Type" },
  { id: "documents", label: "Documents" },
  { id: "review", label: "Review & Submit" },
];

const DRAFT_KEY = "bcas.admission.draft";

const emptyMember = { name: "", occupation: "", phone: "" };

const initialForm = {
  applicationType: "",
  department: "",
  courseAppliedFor: "",
  yearLevel: "",
  academicTerm: "",
  previousSchool: "",
  previousSchoolAddress: "",
  sex: "",
  placeOfBirth: "",
  specialSkills: "",
  father: { ...emptyMember },
  mother: { ...emptyMember },
  motherMaidenName: "",
  guardian: { ...emptyMember },
  studentSignature: "",
  guardianSignature: "",
};

const PEOPLE = [
  { key: "father", label: "Father" },
  { key: "mother", label: "Mother" },
  { key: "guardian", label: "Guardian (if applicable)" },
];

function readDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? { ...initialForm, ...JSON.parse(raw) } : initialForm;
  } catch {
    return initialForm;
  }
}

function saveDraft(form) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  } catch {
    // Private mode or blocked storage: the draft just isn't kept.
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** A submitted application, flattened back into the shape the form edits. */
function formFromApplication(application) {
  const f = application.form ?? {};
  const member = (m) => ({ name: m?.name ?? "", occupation: m?.occupation ?? "", phone: m?.phone ?? "" });
  return {
    applicationType: application.applicationType,
    department: application.department ?? "",
    courseAppliedFor: application.courseAppliedFor,
    yearLevel: f.yearLevel ?? "",
    academicTerm: f.academicTerm ?? "",
    previousSchool: application.previousSchool,
    previousSchoolAddress: f.previousSchoolAddress ?? "",
    sex: f.sex ?? "",
    placeOfBirth: f.placeOfBirth ?? "",
    specialSkills: f.specialSkills ?? "",
    father: member(f.father),
    mother: member(f.mother),
    motherMaidenName: f.motherMaidenName ?? "",
    guardian: member(f.guardian),
    studentSignature: f.studentSignature ?? "",
    guardianSignature: f.guardianSignature ?? "",
  };
}

function Field({ id, label, hint, children }) {
  return (
    <div className="form-row">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint ? <p className="form-note">{hint}</p> : null}
    </div>
  );
}

function ChoiceTile({ name, value, checked, onChange, title, blurb }) {
  return (
    <label className={`choice-tile${checked ? " choice-tile-checked" : ""}`}>
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} />
      <span className="choice-tile-title">{title}</span>
      {blurb ? <span className="choice-tile-blurb">{blurb}</span> : null}
    </label>
  );
}

export default function AdmissionApplicationPage() {
  const navigate = useNavigate();
  const headingRef = useRef(null);
  const [applications, setApplications] = useState([]);
  const [profile, setProfile] = useState(null);
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState(readDraft);
  const [files, setFiles] = useState({});
  const [fileErrors, setFileErrors] = useState({});
  const [step, setStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getMyAdmissionApplications(), getMyProfile().catch(() => null), getAdmissionConfig().catch(() => null)])
      .then(([applicationData, profileData, configData]) => {
        if (cancelled) return;
        setApplications(applicationData);
        setProfile(profileData);
        setConfig(configData);
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

  useEffect(() => {
    saveDraft(form);
  }, [form]);

  // Moving to another stage lands on its heading, so keyboard and screen reader users start at the top of it.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  function set(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleChange(event) {
    set(event.target.name, event.target.value);
  }

  function handleCategory(event) {
    // Every level choice depends on the category, so changing it clears them.
    setForm((prev) => ({
      ...prev,
      department: event.target.value,
      courseAppliedFor: "",
      yearLevel: "",
      academicTerm: "",
    }));
  }

  function handleMemberChange(memberKey, field, value) {
    const next = field === "phone" ? cleanPhoneInput(value) : value;
    setForm((prev) => ({ ...prev, [memberKey]: { ...prev[memberKey], [field]: next } }));
  }

  function handleFile(doc, event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const problem = fileProblem(file, doc.formats);
    setFileErrors((prev) => ({ ...prev, [doc.type]: problem }));
    if (!problem) setFiles((prev) => ({ ...prev, [doc.type]: file }));
  }

  function removeFile(docType) {
    setFiles((prev) => {
      const { [docType]: _removed, ...rest } = prev;
      return rest;
    });
    setFileErrors((prev) => ({ ...prev, [docType]: null }));
  }

  const category = categoryFor(form.department);
  const programs = programsFor(form.department);
  const requiredDocuments = requiredDocumentsFor(form.applicationType || "NewStudent", form.department);
  const birthDate = profile?.birthDate ?? null;
  const tooYoung = ageProblem(form.yearLevel, birthDate, config);

  /** The first thing wrong with a stage, in plain words, or null. */
  function problemWithStep(index) {
    if (index === 0) {
      if (!profile) return "Complete your profile first. Your name, birth date, address and mobile number come from it.";
      if (!form.sex) return "Choose the student's sex.";
      if (!form.placeOfBirth.trim()) return "Enter the student's place of birth.";
      for (const { key, label } of PEOPLE) {
        if (form[key].phone && !isValidPhone(form[key].phone)) return `${label.replace(" (if applicable)", "")}'s mobile number must be ${PHONE_HINT}.`;
      }
      if (form.mother.name.trim() && !form.motherMaidenName.trim()) return "Enter the mother's maiden name.";
      const reachable = PEOPLE.some(({ key }) => form[key].name.trim() && form[key].phone.trim());
      if (!reachable) return "Give the name and mobile number of at least one parent or guardian.";
    }

    if (index === 1) {
      if (!form.department) return "Choose an academic category.";
      if (category.hasStrand && !form.courseAppliedFor) return "Choose a strand.";
      if (form.department === "College" && !form.courseAppliedFor) return "Choose a program.";
      if (!form.yearLevel) return `Choose a ${category.yearLevelLabel.toLowerCase()}.`;
      if (tooYoung) return tooYoung;
      if (category.terms && !form.academicTerm) return `Choose a ${category.termLabel.toLowerCase()}.`;
      if (!form.previousSchool.trim()) return "Enter the school last attended.";
      if (!form.previousSchoolAddress.trim()) return "Enter the address of the school last attended.";
    }

    if (index === 2) {
      if (!form.applicationType) return "Choose your application type.";
    }

    if (index === 3) {
      const missing = requiredDocuments.filter((doc) => doc.required && !files[doc.type]);
      if (missing.length > 0) return `Attach your ${missing.map((d) => d.label).join(", ")} before continuing.`;
    }

    if (index === 4) {
      if (!form.studentSignature.trim()) return "Type the student's name as the student's signature.";
      if (!form.guardianSignature.trim()) return "Type a parent's or guardian's name as their signature.";
    }

    return null;
  }

  function goTo(index) {
    setErrorMessage(null);
    setProfileIncomplete(false);
    setStep(index);
  }

  function handleNext(event) {
    event.preventDefault();
    setProfileIncomplete(false);

    const problem = problemWithStep(step);
    if (problem) {
      setErrorMessage(problem);
      return;
    }

    setErrorMessage(null);
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      setConfirming(true);
    }
  }

  async function sendApplication() {
    setIsSubmitting(true);

    try {
      const created = await submitAdmissionApplication(form);
      clearDraft();

      // The documents belong to the application, so they go up right after it exists.
      const failed = [];
      const toUpload = requiredDocuments.filter((doc) => files[doc.type]);
      for (const [index, doc] of toUpload.entries()) {
        setProgress(`Uploading ${doc.label} (${index + 1} of ${toUpload.length})...`);
        try {
          await uploadDocument(doc.type, files[doc.type]);
        } catch {
          failed.push(doc.label);
        }
      }

      if (failed.length > 0) {
        navigate("/documents", { state: { uploadFailures: failed } });
      } else {
        navigate(`/applications/receipt/${created.applicationId}`);
      }
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
      setProgress(null);
    }
  }

  // One admission application per applicant: once it exists, the form gives way to a record of it.
  const submitted = applications[0] ?? null;

  if (submitted) {
    const values = formFromApplication(submitted);
    return (
      <AppLayout title="My Application">
        <Card className="admission-card admission-card-submitted">
          <h2>Your Admission Application</h2>
          <div className="admission-submitted-note" role="status">
            <div className="admission-submitted-head">
              <StatusBadge status={submitted.status} />
              <span>Submitted {formatDate(submitted.submittedAt)}</span>
            </div>
            <p>
              Your application has been submitted and can no longer be edited or sent again. Follow its progress under{" "}
              <Link to="/application-tracking">Application Tracking</Link>, check your <Link to="/documents">documents</Link>, and
              watch <Link to="/announcements">Announcements</Link> for your exam schedule.
            </p>
          </div>
          <section className="admission-receipt-row" aria-label="Application receipt">
            <div>
              <h3>Application receipt</h3>
              <p>
                {submitted.applicationNumber} &middot; submitted {formatDate(submitted.submittedAt)}
              </p>
            </div>
            <div className="admission-receipt-actions">
              <Link className="btn btn-secondary" to={`/applications/receipt/${submitted.applicationId}`}>
                View
              </Link>
              <Link className="btn btn-secondary" to={`/applications/receipt/${submitted.applicationId}?download=1`}>
                Download
              </Link>
            </div>
          </section>
          <ApplicationSummary values={values} profile={profile} />
        </Card>
      </AppLayout>
    );
  }

  const isLastStep = step === STEPS.length - 1;

  return (
    <AppLayout title="My Application">
      <Card className="admission-card">
        <h2>Admission Application</h2>

        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <>
            <AdmissionStepper steps={STEPS} current={step} onSelect={goTo} />

            <form onSubmit={handleNext} noValidate className="admission-form">
              <h3 className="admission-step-heading" tabIndex={-1} ref={headingRef}>
                {STEPS[step].label}
              </h3>

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

              {step === 0 && (
                <div className="admission-step">
                  <h4 className="form-section-title">Student</h4>
                  <dl className="form-profile">
                    <div>
                      <dt>Full name</dt>
                      <dd>{profile ? `${profile.firstName} ${profile.lastName}` : "—"}</dd>
                    </div>
                    <div>
                      <dt>Date of birth</dt>
                      <dd>{profile?.birthDate ? formatDate(`${profile.birthDate}T00:00:00`) : "—"}</dd>
                    </div>
                    <div>
                      <dt>Mobile number</dt>
                      <dd>{profile?.contactNumber || "—"}</dd>
                    </div>
                    <div className="form-profile-wide">
                      <dt>Address</dt>
                      <dd>
                        {profile
                          ? [profile.addressLine, profile.city, profile.province, profile.postalCode].filter(Boolean).join(", ")
                          : "—"}
                      </dd>
                    </div>
                  </dl>
                  <p className="form-note">
                    {profile ? (
                      <>
                        These come from your profile. <Link to="/profile">Update your profile</Link> if anything is wrong.
                      </>
                    ) : (
                      <>
                        <Link to="/profile">Complete your profile</Link> first. Your name, birth date, address and mobile number are
                        taken from it.
                      </>
                    )}
                  </p>

                  <div className="form-grid">
                    <Field id="sex" label="Sex">
                      <select id="sex" name="sex" required value={form.sex} onChange={handleChange}>
                        <option value="" disabled>
                          Select
                        </option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </Field>
                    <Field id="placeOfBirth" label="Place of birth">
                      <input id="placeOfBirth" name="placeOfBirth" type="text" maxLength={200} placeholder="e.g. Quezon City" value={form.placeOfBirth} onChange={handleChange} />
                    </Field>
                  </div>
                  <Field id="specialSkills" label="Special skills (optional)">
                    <input id="specialSkills" name="specialSkills" type="text" maxLength={300} placeholder="e.g. Drawing, basketball, singing" value={form.specialSkills} onChange={handleChange} />
                  </Field>

                  <h4 className="form-section-title">Parents and guardian</h4>
                  {PEOPLE.map(({ key, label }) => (
                    <fieldset key={key} className="family-group">
                      <legend className="family-group-title">{label}</legend>
                      <div className="family-fields">
                        <Field id={`${key}-name`} label="Full name">
                          <input id={`${key}-name`} type="text" maxLength={200} value={form[key].name} onChange={(e) => handleMemberChange(key, "name", e.target.value)} />
                        </Field>
                        {key === "mother" && (
                          <Field id="motherMaidenName" label="Maiden name">
                            <input id="motherMaidenName" name="motherMaidenName" type="text" maxLength={200} value={form.motherMaidenName} onChange={handleChange} />
                          </Field>
                        )}
                        <Field id={`${key}-occupation`} label="Occupation">
                          <input id={`${key}-occupation`} type="text" maxLength={100} value={form[key].occupation} onChange={(e) => handleMemberChange(key, "occupation", e.target.value)} />
                        </Field>
                        <Field id={`${key}-phone`} label="Mobile number">
                          <input
                            id={`${key}-phone`}
                            type="tel"
                            inputMode="numeric"
                            maxLength={11}
                            pattern={PHONE_PATTERN}
                            placeholder="09171234567"
                            value={form[key].phone}
                            onChange={(e) => handleMemberChange(key, "phone", e.target.value)}
                          />
                        </Field>
                      </div>
                    </fieldset>
                  ))}
                  <p className="form-note">Give the name and mobile number of at least one of them. Mobile numbers are {PHONE_HINT}.</p>
                </div>
              )}

              {step === 1 && (
                <div className="admission-step">
                  <fieldset className="choice-group">
                    <legend className="form-section-title">Academic category</legend>
                    <div className="choice-grid choice-grid-4">
                      {ACADEMIC_CATEGORIES.map((c) => (
                        <ChoiceTile
                          key={c.value}
                          name="department"
                          value={c.value}
                          checked={form.department === c.value}
                          onChange={handleCategory}
                          title={c.label}
                          blurb={c.blurb}
                        />
                      ))}
                    </div>
                  </fieldset>

                  {category && (
                    <>
                      <h4 className="form-section-title">{category.label} details</h4>
                      <div className="form-grid">
                        {form.department === "College" && (
                          <Field id="courseAppliedFor" label="Program">
                            <select id="courseAppliedFor" name="courseAppliedFor" value={form.courseAppliedFor} onChange={handleChange}>
                              <option value="" disabled>
                                Select a program
                              </option>
                              {programs.map((program) => (
                                <option key={program.code} value={program.code}>
                                  {programOptionLabel(program)}
                                </option>
                              ))}
                            </select>
                          </Field>
                        )}
                        {category.hasStrand && (
                          <Field id="courseAppliedFor" label="Strand">
                            <select id="courseAppliedFor" name="courseAppliedFor" value={form.courseAppliedFor} onChange={handleChange}>
                              <option value="" disabled>
                                Select a strand
                              </option>
                              {SENIOR_HIGH_STRANDS.map((strand) => (
                                <option key={strand} value={strand}>
                                  {strand}
                                </option>
                              ))}
                            </select>
                          </Field>
                        )}
                        <Field id="yearLevel" label={category.yearLevelLabel}>
                          <select id="yearLevel" name="yearLevel" value={form.yearLevel} onChange={handleChange}>
                            <option value="" disabled>
                              Select
                            </option>
                            {category.yearLevels.map((level) => (
                              <option key={level} value={level}>
                                {level}
                              </option>
                            ))}
                          </select>
                        </Field>
                        {category.terms && (
                          <Field id="academicTerm" label={category.termLabel}>
                            <select id="academicTerm" name="academicTerm" value={form.academicTerm} onChange={handleChange}>
                              <option value="" disabled>
                                Select
                              </option>
                              {category.terms.map((term) => (
                                <option key={term} value={term}>
                                  {term}
                                </option>
                              ))}
                            </select>
                          </Field>
                        )}
                      </div>
                      {tooYoung && (
                        <p className="form-error" role="alert">
                          {tooYoung}
                        </p>
                      )}
                      {config && <p className="form-note">Applying for academic year {config.academicYear}.</p>}
                    </>
                  )}

                  <h4 className="form-section-title">School last attended</h4>
                  <Field id="previousSchool" label="School name">
                    <input id="previousSchool" name="previousSchool" type="text" maxLength={200} placeholder="e.g. San Isidro Elementary School" value={form.previousSchool} onChange={handleChange} />
                  </Field>
                  <Field id="previousSchoolAddress" label="School address">
                    <input id="previousSchoolAddress" name="previousSchoolAddress" type="text" maxLength={300} placeholder="e.g. 123 Rizal St., Brgy. San Isidro, Quezon City" value={form.previousSchoolAddress} onChange={handleChange} />
                  </Field>
                </div>
              )}

              {step === 2 && (
                <div className="admission-step">
                  <fieldset className="choice-group">
                    <legend className="form-section-title">Which best describes you?</legend>
                    <div className="choice-grid choice-grid-3">
                      {APPLICATION_TYPES.map((type) => (
                        <ChoiceTile
                          key={type.value}
                          name="applicationType"
                          value={type.value}
                          checked={form.applicationType === type.value}
                          onChange={handleChange}
                          title={type.label}
                          blurb={type.blurb}
                        />
                      ))}
                    </div>
                  </fieldset>
                  {form.applicationType && (
                    <p className="form-note">
                      Your documents depend on this choice
                      {form.applicationType === "Transferee" && form.department === "College"
                        ? ": a College transferee also submits a Transcript of Records (TOR)."
                        : "."}{" "}
                      You attach them in the next step.
                    </p>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="admission-step">
                  <p className="form-note">
                    {REQUIRED_NOTE} Each file is checked against the format shown beside it. Files up to 10 MB.
                  </p>
                  <ul className="admission-docs">
                    {requiredDocuments.map((doc) => {
                      const file = files[doc.type];
                      const inputId = `doc-${doc.type}`;
                      return (
                        <li key={doc.type} className="admission-doc">
                          <div className="admission-doc-head">
                            <span className="admission-doc-name">
                              {doc.label}
                              {doc.required ? (
                                <span className="required-mark" title="Required" aria-label="required">
                                  {" "}
                                  *
                                </span>
                              ) : null}
                              <span className="admission-doc-format"> ({formatsLabel(doc.formats)})</span>
                            </span>
                            <span className={`admission-doc-state${file ? " admission-doc-state-ready" : ""}`}>
                              {file ? "Ready to upload" : doc.required ? "Not attached" : "After the exam"}
                            </span>
                          </div>

                          {file && (
                            <p className="admission-doc-file">
                              {file.name} <span>&middot; {formatFileSize(file.size)}</span>
                            </p>
                          )}
                          {fileErrors[doc.type] && (
                            <p className="form-error" role="alert">
                              {fileErrors[doc.type]}
                            </p>
                          )}

                          {doc.required && (
                            <div className="admission-doc-actions">
                              <label className="documents-upload-button" htmlFor={inputId}>
                                {file ? "Replace file" : "Choose file"}
                              </label>
                              <input
                                id={inputId}
                                className="admission-doc-input"
                                type="file"
                                accept={acceptFor(doc.formats)}
                                onChange={(e) => handleFile(doc, e)}
                              />
                              {file && (
                                <button type="button" className="admission-doc-remove" onClick={() => removeFile(doc.type)}>
                                  Remove
                                </button>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {step === 4 && (
                <div className="admission-step">
                  <p className="form-note">Check everything below. You can&apos;t change your application after you submit it.</p>
                  <ApplicationSummary values={form} profile={profile} requiredDocuments={requiredDocuments} files={files} onEdit={goTo} />

                  <h4 className="form-section-title">Declaration</h4>
                  <div className="form-grid">
                    <Field id="studentSignature" label="Student's signature over printed name">
                      <input id="studentSignature" name="studentSignature" type="text" maxLength={200} className="signature-input" placeholder="e.g. Juan Dela Cruz" value={form.studentSignature} onChange={handleChange} />
                    </Field>
                    <Field id="guardianSignature" label="Parent's / guardian's signature over printed name">
                      <input id="guardianSignature" name="guardianSignature" type="text" maxLength={200} className="signature-input" placeholder="e.g. Maria Dela Cruz" value={form.guardianSignature} onChange={handleChange} />
                    </Field>
                  </div>
                  <p className="form-note">Type the full name of each person. Typing it counts as their signature.</p>
                </div>
              )}

              <div className="admission-actions">
                {step > 0 ? (
                  <button type="button" className="btn btn-secondary" onClick={() => goTo(step - 1)} disabled={isSubmitting}>
                    Back
                  </button>
                ) : (
                  <span />
                )}
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isLastStep ? "Submit Application" : "Continue"}
                </button>
              </div>
              {progress && (
                <p className="form-note" role="status">
                  {progress}
                </p>
              )}
            </form>
          </>
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
