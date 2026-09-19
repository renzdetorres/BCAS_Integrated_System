import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, School, BookOpen, Landmark } from "lucide-react";
import AppShell from "../components/layout/AppShell.jsx";
import Card from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import Modal from "../components/ui/Modal.jsx";
import { inputClasses, labelClasses, primaryButtonClasses, outlineButtonClasses } from "../lib/formStyles.js";
import {
  APPLICATION_TYPES,
  getMyAdmissionApplications,
  submitAdmissionApplication,
} from "../api/admissionApi.js";
import {
  getAvailableScholarships,
  getMyScholarshipApplications,
  submitScholarshipApplication,
} from "../api/scholarshipApi.js";
import { ApiError } from "../api/apiClient.js";

const LEVELS = [
  {
    key: "Elementary",
    icon: BookOpen,
    description: "Grades 1 through 6 for young learners beginning their academic journey.",
  },
  {
    key: "High School",
    icon: School,
    description: "Grades 7 through 10 under the K-12 Junior High School curriculum.",
  },
  {
    key: "Senior High School",
    icon: GraduationCap,
    description: "Grades 11 and 12 with a choice of academic and vocational tracks.",
  },
  {
    key: "College",
    icon: Landmark,
    description: "Degree programs for incoming freshmen and transferee students.",
  },
];

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function AdmissionTab() {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeLevel, setActiveLevel] = useState(null);
  const [form, setForm] = useState({
    applicationType: APPLICATION_TYPES[0].value,
    courseAppliedFor: "",
    previousSchool: "",
  });
  const [errorMessage, setErrorMessage] = useState(null);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reload() {
    setIsLoading(true);
    getMyAdmissionApplications()
      .then(setApplications)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }

  useEffect(reload, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    setProfileIncomplete(false);
    setIsSubmitting(true);

    try {
      await submitAdmissionApplication(form);
      setActiveLevel(null);
      reload();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
        setProfileIncomplete(error.message.toLowerCase().includes("profile"));
      } else {
        setErrorMessage("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const existingApplication = applications[0];

  if (isLoading) {
    return <p className="text-sm text-slate-400">Loading...</p>;
  }

  if (existingApplication) {
    return (
      <Card>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Your Admission Application</h3>
          <StatusBadge status={existingApplication.status} />
        </div>
        <p className="mt-3 text-sm text-slate-600">
          {APPLICATION_TYPES.find((t) => t.value === existingApplication.applicationType)?.label}
          {" · "}
          {existingApplication.courseAppliedFor}
        </p>
        <p className="mt-1 text-sm text-slate-400">
          Previous school: {existingApplication.previousSchool} · Submitted{" "}
          {formatDate(existingApplication.submittedAt)}
        </p>
        <p className="mt-4 text-xs text-slate-400">
          Your application is read-only pending review. Track its progress under{" "}
          <Link to="/application-tracking" className="font-semibold text-forest hover:underline">
            Application Status
          </Link>
          .
        </p>
      </Card>
    );
  }

  return (
    <>
      <h2 className="text-lg font-bold text-slate-900">Admission Application Form</h2>
      <p className="mt-1 text-sm text-slate-500">Select the program level you are applying for</p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {LEVELS.map((level) => {
          const Icon = level.icon;
          return (
            <Card key={level.key} className="flex flex-col items-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-forest/10 text-forest">
                <Icon size={22} />
              </span>
              <h3 className="mt-3 font-bold text-slate-900">{level.key}</h3>
              <p className="mt-1 flex-1 text-sm text-slate-500">{level.description}</p>
              <button
                type="button"
                onClick={() => setActiveLevel(level.key)}
                className={`${outlineButtonClasses} mt-4 w-full`}
              >
                Apply Now
              </button>
            </Card>
          );
        })}
      </div>

      {activeLevel && (
        <Modal title={`Apply — ${activeLevel}`} onClose={() => setActiveLevel(null)}>
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label className={labelClasses} htmlFor="applicationType">
                Application type
              </label>
              <select
                id="applicationType"
                className={inputClasses}
                value={form.applicationType}
                onChange={(e) => setForm((prev) => ({ ...prev, applicationType: e.target.value }))}
              >
                {APPLICATION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClasses} htmlFor="courseAppliedFor">
                Course / strand applied for
              </label>
              <input
                id="courseAppliedFor"
                className={inputClasses}
                required
                value={form.courseAppliedFor}
                onChange={(e) => setForm((prev) => ({ ...prev, courseAppliedFor: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClasses} htmlFor="previousSchool">
                Previous school
              </label>
              <input
                id="previousSchool"
                className={inputClasses}
                required
                value={form.previousSchool}
                onChange={(e) => setForm((prev) => ({ ...prev, previousSchool: e.target.value }))}
              />
            </div>

            {errorMessage && (
              <p className="text-sm font-medium text-status-red" role="alert">
                {errorMessage}
                {profileIncomplete && (
                  <>
                    {" "}
                    <Link to="/profile" className="underline">
                      Complete your profile
                    </Link>
                    .
                  </>
                )}
              </p>
            )}

            <button type="submit" disabled={isSubmitting} className={`${primaryButtonClasses} w-full`}>
              {isSubmitting ? "Submitting..." : "Submit Application"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}

function ScholarshipTab() {
  const [scholarships, setScholarships] = useState([]);
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({ scholarshipId: "", gradeAverage: "" });
  const [errorMessage, setErrorMessage] = useState(null);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reload() {
    setIsLoading(true);
    Promise.all([getAvailableScholarships(), getMyScholarshipApplications()])
      .then(([scholarshipData, applicationData]) => {
        setScholarships(scholarshipData);
        setApplications(applicationData);
        if (scholarshipData.length > 0) {
          setForm((prev) => ({ ...prev, scholarshipId: String(scholarshipData[0].scholarshipId) }));
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }

  useEffect(reload, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    setProfileIncomplete(false);
    setIsSubmitting(true);

    try {
      await submitScholarshipApplication({
        scholarshipId: Number(form.scholarshipId),
        gradeAverage: Number(form.gradeAverage),
      });
      reload();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
        setProfileIncomplete(error.message.toLowerCase().includes("profile"));
      } else {
        setErrorMessage("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-slate-400">Loading...</p>;
  }

  const existingApplication = applications[0];

  if (existingApplication) {
    return (
      <Card>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Your Scholarship Application</h3>
          <StatusBadge status={existingApplication.status} />
        </div>
        <p className="mt-3 text-sm text-slate-600">
          {existingApplication.scholarshipName} · {existingApplication.scholarshipType}
        </p>
        <p className="mt-1 text-sm text-slate-400">
          Grade average {existingApplication.gradeAverage} · Submitted{" "}
          {formatDate(existingApplication.submittedAt)}
        </p>
        <p className="mt-4 text-xs text-slate-400">
          Your application is read-only pending review. Track its progress under{" "}
          <Link to="/application-tracking" className="font-semibold text-forest hover:underline">
            Application Status
          </Link>
          .
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-lg font-bold text-slate-900">Scholarship Application Form</h2>
      <p className="mt-1 text-sm text-slate-500">Choose an open scholarship slot and submit your grade average.</p>

      {scholarships.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No scholarship slots are currently open for applications.</p>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
          <div>
            <label className={labelClasses} htmlFor="scholarshipId">
              Scholarship
            </label>
            <select
              id="scholarshipId"
              className={inputClasses}
              value={form.scholarshipId}
              onChange={(e) => setForm((prev) => ({ ...prev, scholarshipId: e.target.value }))}
              required
            >
              {scholarships.map((s) => (
                <option key={s.scholarshipId} value={s.scholarshipId}>
                  {s.name} ({s.scholarshipType}) — {s.remainingSlots} slot
                  {s.remainingSlots === 1 ? "" : "s"} left
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClasses} htmlFor="gradeAverage">
              Grade average
            </label>
            <input
              id="gradeAverage"
              type="number"
              step="0.01"
              min="0"
              max="999.99"
              className={inputClasses}
              required
              value={form.gradeAverage}
              onChange={(e) => setForm((prev) => ({ ...prev, gradeAverage: e.target.value }))}
            />
          </div>

          {errorMessage && (
            <p className="text-sm font-medium text-status-red" role="alert">
              {errorMessage}
              {profileIncomplete && (
                <>
                  {" "}
                  <Link to="/profile" className="underline">
                    Complete your profile
                  </Link>
                  .
                </>
              )}
            </p>
          )}

          <button type="submit" disabled={isSubmitting} className={primaryButtonClasses}>
            {isSubmitting ? "Submitting..." : "Submit Application"}
          </button>
        </form>
      )}
    </Card>
  );
}

export default function MyApplicationPage() {
  const [tab, setTab] = useState("admission");

  return (
    <AppShell>
      <h1 className="text-2xl font-extrabold text-slate-900">My Application</h1>
      <p className="mt-1 text-sm text-slate-500">
        Apply for admission or scholarship. Once submitted, your application is read-only pending review.
      </p>

      <div className="mt-6 flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab("admission")}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${
            tab === "admission" ? "border-forest text-forest" : "border-transparent text-slate-500"
          }`}
        >
          Apply for Admission
        </button>
        <button
          type="button"
          onClick={() => setTab("scholarship")}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${
            tab === "scholarship" ? "border-forest text-forest" : "border-transparent text-slate-500"
          }`}
        >
          Apply for Scholarship
        </button>
      </div>

      <div className="mt-6">{tab === "admission" ? <AdmissionTab /> : <ScholarshipTab />}</div>
    </AppShell>
  );
}
