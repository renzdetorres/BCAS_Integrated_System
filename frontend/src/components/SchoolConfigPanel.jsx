import { useEffect, useState } from "react";
import { getSchoolConfig, saveSchoolConfig } from "../api/schoolConfigApi.js";
import { ApiError } from "../api/apiClient.js";
import PaymentMethodsEditor, { methodsFromConfig } from "./PaymentMethodsEditor.jsx";
import Card from "./ui/Card.jsx";
import "./SchoolConfigPanel.css";
import Skeleton from "./ui/Skeleton.jsx";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Admission settings an admin edits: academic year, Pre-Kinder / Kindergarten age policy, exam fee and payment details. */
export default function SchoolConfigPanel() {
  const [values, setValues] = useState(null);
  const [methods, setMethods] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getSchoolConfig()
      .then((data) => {
        if (cancelled) return;
        setValues(data);
        setMethods(methodsFromConfig(data));
      })
      .catch((error) => {
        if (!cancelled) setErrorMessage(error instanceof ApiError ? error.message : "Failed to load admission settings.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleChange(event) {
    setMessage(null);
    setValues((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);
    try {
      // The academic lists belong to their own panel; resending them here could overwrite its newer edits.
      const own = Object.fromEntries(Object.entries(values).filter(([key]) => !key.startsWith("Academic.")));
      own["Payment.Methods"] = JSON.stringify(methods);
      // With no methods left, the older single account and QR code go too, or applicants would still be offered them.
      if (methods.length === 0) {
        own["Payment.AccountName"] = "";
        own["Payment.QrImage"] = "";
      }

      const saved = await saveSchoolConfig(own);
      setValues(saved);
      setMethods(methodsFromConfig(saved));
      setMessage("Settings saved.");
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <h2 className="school-config-title">Admission settings</h2>
      <p className="school-config-subtitle">
        The academic year applicants apply for, the age rule for Pre-Kinder and Kindergarten, how the entrance exam is scored, and the payment details.
      </p>

      {errorMessage && (
        <p className="form-error" role="alert">
          {errorMessage}
        </p>
      )}

      {!values && !errorMessage && <Skeleton variant="form" />}

      {values && (
        <form onSubmit={handleSubmit} className="school-config-form">
          <div className="school-config-group">
            <h3>Academic year</h3>
            <div className="form-row">
              <label htmlFor="Admission.AcademicYear">Applications are filed for</label>
              <input
                id="Admission.AcademicYear"
                name="Admission.AcademicYear"
                type="text"
                placeholder="2026-2027"
                value={values["Admission.AcademicYear"]}
                onChange={handleChange}
              />
              <p className="form-note">Leave blank to follow the calendar (the school year starts in June).</p>
            </div>
          </div>

          <div className="school-config-group">
            <h3>Pre-Kinder and Kindergarten age</h3>
            <p className="form-note">
              An applicant qualifies if they have reached the minimum age by the end of the cutoff month of the academic year, not only on
              the day they apply.
            </p>
            <div className="form-grid school-config-grid-3">
              <div className="form-row">
                <label htmlFor="AgePolicy.PreKinderMinAge">Pre-Kinder minimum age</label>
                <input id="AgePolicy.PreKinderMinAge" name="AgePolicy.PreKinderMinAge" type="number" min="1" max="12" value={values["AgePolicy.PreKinderMinAge"]} onChange={handleChange} />
              </div>
              <div className="form-row">
                <label htmlFor="AgePolicy.KinderMinAge">Kindergarten minimum age</label>
                <input id="AgePolicy.KinderMinAge" name="AgePolicy.KinderMinAge" type="number" min="1" max="12" value={values["AgePolicy.KinderMinAge"]} onChange={handleChange} />
              </div>
              <div className="form-row">
                <label htmlFor="AgePolicy.CutoffMonth">Age is counted until the end of</label>
                <select id="AgePolicy.CutoffMonth" name="AgePolicy.CutoffMonth" value={values["AgePolicy.CutoffMonth"]} onChange={handleChange}>
                  {MONTHS.map((month, index) => (
                    <option key={month} value={String(index + 1)}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="school-config-group">
            <h3>Entrance exam scoring</h3>
            <p className="form-note">
              Staff enter each applicant's raw score and the result follows from it: at or above the passing score is Passed; below it is
              Retake until the retakes allowed are used up, then Failed.
            </p>
            <div className="form-grid school-config-grid-3">
              <div className="form-row">
                <label htmlFor="Exam.TotalItems">Items on the exam</label>
                <input id="Exam.TotalItems" name="Exam.TotalItems" type="number" min="1" max="999" value={values["Exam.TotalItems"]} onChange={handleChange} />
              </div>
              <div className="form-row">
                <label htmlFor="Exam.PassingScore">Passing raw score</label>
                <input id="Exam.PassingScore" name="Exam.PassingScore" type="number" min="0" max="999" step="0.01" value={values["Exam.PassingScore"]} onChange={handleChange} />
              </div>
              <div className="form-row">
                <label htmlFor="Exam.MaxRetakes">Retakes allowed</label>
                <input id="Exam.MaxRetakes" name="Exam.MaxRetakes" type="number" min="0" max="10" value={values["Exam.MaxRetakes"]} onChange={handleChange} />
              </div>
            </div>
          </div>

          <div className="school-config-group">
            <h3>Entrance exam payment</h3>
            <div className="form-grid">
              <div className="form-row">
                <label htmlFor="Payment.ExamFee">Exam fee (PHP)</label>
                <input id="Payment.ExamFee" name="Payment.ExamFee" type="number" min="0" step="0.01" value={values["Payment.ExamFee"]} onChange={handleChange} />
              </div>
            </div>
            <PaymentMethodsEditor methods={methods} onChange={(next) => { setMessage(null); setMethods(next); }} />
          </div>

          <div className="school-config-actions">
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save settings"}
            </button>
            {message && (
              <span className="school-config-saved" role="status">
                {message}
              </span>
            )}
          </div>
        </form>
      )}
    </Card>
  );
}
