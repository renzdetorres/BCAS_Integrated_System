import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/layout/AppShell.jsx";
import Card from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { inputClasses, outlineButtonClasses, primaryButtonClasses } from "../lib/formStyles.js";
import {
  exportEnrollmentList,
  exportEnrollmentSummary,
  exportSectionFiles,
  getEnrollmentList,
  getEnrollmentSummary,
  getScholarshipApplicantList,
  getScholarshipQualificationList,
  getScholarshipResultList,
  getScholarshipSlotReport,
  getSectionFiles,
} from "../api/adminReportsApi.js";
import { ApiError } from "../api/apiClient.js";

const REPORTS = [
  { key: "enrollmentList", category: "Admission", label: "Enrollment List" },
  { key: "enrollmentSummary", category: "Admission", label: "Summary of Enrollment" },
  { key: "sectionFiles", category: "Admission", label: "File per Section" },
  { key: "scholarshipApplicants", category: "Scholarship", label: "Scholarship Applicant List" },
  { key: "scholarshipQualification", category: "Scholarship", label: "Qualified / Not Qualified" },
  { key: "scholarshipResults", category: "Scholarship", label: "Scholarship Results" },
  { key: "scholarshipSlots", category: "Scholarship", label: "Scholarship Slot Report" },
];

function formatDate(isoDateTime) {
  if (!isoDateTime) return "—";
  return new Date(isoDateTime).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function useReportError() {
  const [errorMessage, setErrorMessage] = useState(null);
  const runReport = useCallback(async (loader) => {
    setErrorMessage(null);
    try {
      return await loader();
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to load this report.");
      return null;
    }
  }, []);
  return { errorMessage, runReport };
}

function ReportError({ message }) {
  if (!message) return null;
  return (
    <p className="mt-3 text-sm font-medium text-status-red" role="alert">
      {message}
    </p>
  );
}

function ReportTable({ columns, rows, rowKey }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-max border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {columns.map((c) => (
              <th key={c.header} className="px-3 py-2">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-slate-50 last:border-0">
              {columns.map((c) => (
                <td key={c.header} className="px-3 py-3 align-middle text-slate-700">
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ApplicantCell({ name, email }) {
  return (
    <div>
      <span className="block font-semibold text-slate-800">{name}</span>
      <span className="block text-xs text-slate-400">{email}</span>
    </div>
  );
}

function EnrollmentListReport() {
  const [filters, setFilters] = useState({ program: "", applicationType: "" });
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const { errorMessage, runReport } = useReportError();

  const load = useCallback(
    async (activeFilters) => {
      setIsLoading(true);
      const data = await runReport(() => getEnrollmentList(activeFilters));
      if (data) setRows(data);
      setIsLoading(false);
    },
    [runReport]
  );

  useEffect(() => {
    load(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleExport() {
    setIsExporting(true);
    await runReport(async () => {
      await exportEnrollmentList(filters);
      return true;
    });
    setIsExporting(false);
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">Enrollment List</h2>
        <button type="button" onClick={handleExport} disabled={isExporting} className={primaryButtonClasses}>
          {isExporting ? "Exporting..." : "↓ Export to Excel"}
        </button>
      </div>
      <p className="mt-1 text-sm text-slate-500">Approved admission applicants who have reserved their slot.</p>

      <form
        className="mt-4 flex flex-wrap gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          load(filters);
        }}
      >
        <input
          type="text"
          placeholder="Program"
          className={`${inputClasses} max-w-xs`}
          value={filters.program}
          onChange={(event) => setFilters((prev) => ({ ...prev, program: event.target.value }))}
        />
        <select
          className={`${inputClasses} max-w-xs`}
          value={filters.applicationType}
          onChange={(event) => setFilters((prev) => ({ ...prev, applicationType: event.target.value }))}
        >
          <option value="">All types</option>
          <option value="NewStudent">New Student</option>
          <option value="Transferee">Transferee</option>
        </select>
        <button type="submit" className={outlineButtonClasses}>
          Filter
        </button>
      </form>

      <ReportError message={errorMessage} />

      {isLoading ? (
        <p className="mt-4 text-sm text-slate-400">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">No enrolled applicants match these filters.</p>
      ) : (
        <ReportTable
          rowKey={(r) => r.applicationId}
          columns={[
            { header: "Applicant", render: (r) => <ApplicantCell name={r.applicantName} email={r.applicantEmail} /> },
            { header: "Type", render: (r) => r.applicationType },
            { header: "Program", render: (r) => r.courseAppliedFor },
            { header: "Submitted", render: (r) => formatDate(r.submittedAt) },
            { header: "Reserved", render: (r) => formatDate(r.reservedAt) },
          ]}
          rows={rows}
        />
      )}
    </Card>
  );
}

function EnrollmentSummaryReport() {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const { errorMessage, runReport } = useReportError();

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const data = await runReport(() => getEnrollmentSummary());
      if (data) setSummary(data);
      setIsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleExport() {
    setIsExporting(true);
    await runReport(async () => {
      await exportEnrollmentSummary();
      return true;
    });
    setIsExporting(false);
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">Summary of Enrollment</h2>
        <button type="button" onClick={handleExport} disabled={isExporting} className={primaryButtonClasses}>
          {isExporting ? "Exporting..." : "↓ Export to Excel"}
        </button>
      </div>

      <ReportError message={errorMessage} />

      {isLoading ? (
        <p className="mt-4 text-sm text-slate-400">Loading...</p>
      ) : summary ? (
        <>
          <p className="mt-4 text-sm text-slate-600">
            Total Enrolled: <strong className="font-bold text-slate-900">{summary.totalEnrolled}</strong>
          </p>
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 font-semibold text-slate-700">By Program</h3>
              <ReportTable
                rowKey={(r) => r.program}
                columns={[
                  { header: "Program", render: (r) => r.program },
                  { header: "Count", render: (r) => r.count },
                ]}
                rows={summary.byProgram}
              />
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-slate-700">By Application Type</h3>
              <ReportTable
                rowKey={(r) => r.applicationType}
                columns={[
                  { header: "Type", render: (r) => r.applicationType },
                  { header: "Count", render: (r) => r.count },
                ]}
                rows={summary.byApplicationType}
              />
            </div>
          </div>
        </>
      ) : null}
    </Card>
  );
}

function SectionFilesReport() {
  const [sections, setSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const { errorMessage, runReport } = useReportError();

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const data = await runReport(() => getSectionFiles());
      if (data) setSections(data);
      setIsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleExport() {
    setIsExporting(true);
    await runReport(async () => {
      await exportSectionFiles();
      return true;
    });
    setIsExporting(false);
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">File per Section</h2>
        <button type="button" onClick={handleExport} disabled={isExporting} className={primaryButtonClasses}>
          {isExporting ? "Exporting..." : "↓ Export to Excel"}
        </button>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Enrolled applicants grouped by their applied-for course, used here as the section grouping.
      </p>

      <ReportError message={errorMessage} />

      {isLoading ? (
        <p className="mt-4 text-sm text-slate-400">Loading...</p>
      ) : sections.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">No enrolled applicants yet.</p>
      ) : (
        sections.map((section) => (
          <div key={section.section} className="mb-6 last:mb-0">
            <h3 className="mb-2 font-semibold text-slate-700">{section.section}</h3>
            <ReportTable
              rowKey={(s) => s.applicationId}
              columns={[
                { header: "Applicant", render: (s) => <ApplicantCell name={s.applicantName} email={s.applicantEmail} /> },
                { header: "Type", render: (s) => s.applicationType },
                { header: "Submitted", render: (s) => formatDate(s.submittedAt) },
              ]}
              rows={section.students}
            />
          </div>
        ))
      )}
    </Card>
  );
}

function ScholarshipApplicantListReport() {
  const [filters, setFilters] = useState({ scholarshipName: "", status: "" });
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { errorMessage, runReport } = useReportError();

  const load = useCallback(
    async (activeFilters) => {
      setIsLoading(true);
      const data = await runReport(() => getScholarshipApplicantList(activeFilters));
      if (data) setRows(data);
      setIsLoading(false);
    },
    [runReport]
  );

  useEffect(() => {
    load(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card>
      <h2 className="text-lg font-bold text-slate-900">Scholarship Applicant List</h2>

      <form
        className="mt-4 flex flex-wrap gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          load(filters);
        }}
      >
        <input
          type="text"
          placeholder="Scholarship name"
          className={`${inputClasses} max-w-xs`}
          value={filters.scholarshipName}
          onChange={(event) => setFilters((prev) => ({ ...prev, scholarshipName: event.target.value }))}
        />
        <input
          type="text"
          placeholder="Status"
          className={`${inputClasses} max-w-xs`}
          value={filters.status}
          onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
        />
        <button type="submit" className={outlineButtonClasses}>
          Filter
        </button>
      </form>

      <ReportError message={errorMessage} />

      {isLoading ? (
        <p className="mt-4 text-sm text-slate-400">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">No scholarship applications match these filters.</p>
      ) : (
        <ReportTable
          rowKey={(r) => r.applicationId}
          columns={[
            { header: "Applicant", render: (r) => <ApplicantCell name={r.applicantName} email={r.applicantEmail} /> },
            { header: "Scholarship", render: (r) => r.scholarshipName },
            { header: "Grade Avg.", render: (r) => r.gradeAverage },
            { header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            { header: "Submitted", render: (r) => formatDate(r.submittedAt) },
          ]}
          rows={rows}
        />
      )}
    </Card>
  );
}

function ScholarshipQualificationReport() {
  const [verdict, setVerdict] = useState("");
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { errorMessage, runReport } = useReportError();

  const load = useCallback(
    async (activeVerdict) => {
      setIsLoading(true);
      const data = await runReport(() => getScholarshipQualificationList({ verdict: activeVerdict }));
      if (data) setRows(data);
      setIsLoading(false);
    },
    [runReport]
  );

  useEffect(() => {
    load(verdict);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card>
      <h2 className="text-lg font-bold text-slate-900">Qualified / Not Qualified Applicants</h2>

      <form
        className="mt-4 flex flex-wrap gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          load(verdict);
        }}
      >
        <select className={`${inputClasses} max-w-xs`} value={verdict} onChange={(event) => setVerdict(event.target.value)}>
          <option value="">All verdicts</option>
          <option value="Qualified">Qualified</option>
          <option value="NotQualified">Not Qualified</option>
        </select>
        <button type="submit" className={outlineButtonClasses}>
          Filter
        </button>
      </form>

      <ReportError message={errorMessage} />

      {isLoading ? (
        <p className="mt-4 text-sm text-slate-400">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">No eligibility screenings match this filter.</p>
      ) : (
        <ReportTable
          rowKey={(r) => r.applicationId}
          columns={[
            { header: "Applicant", render: (r) => <ApplicantCell name={r.applicantName} email={r.applicantEmail} /> },
            { header: "Scholarship", render: (r) => r.scholarshipName },
            { header: "Verdict", render: (r) => <StatusBadge status={r.verdict === "Qualified" ? "Qualified" : "Not Qualified"} /> },
            { header: "Evaluated By", render: (r) => r.evaluatedByName },
            { header: "Evaluated", render: (r) => formatDate(r.evaluatedAt) },
          ]}
          rows={rows}
        />
      )}
    </Card>
  );
}

function ScholarshipResultsReport() {
  const [decision, setDecision] = useState("");
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { errorMessage, runReport } = useReportError();

  const load = useCallback(
    async (activeDecision) => {
      setIsLoading(true);
      const data = await runReport(() => getScholarshipResultList({ decision: activeDecision }));
      if (data) setRows(data);
      setIsLoading(false);
    },
    [runReport]
  );

  useEffect(() => {
    load(decision);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card>
      <h2 className="text-lg font-bold text-slate-900">Scholarship Results</h2>

      <form
        className="mt-4 flex flex-wrap gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          load(decision);
        }}
      >
        <select className={`${inputClasses} max-w-xs`} value={decision} onChange={(event) => setDecision(event.target.value)}>
          <option value="">All results</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
        <button type="submit" className={outlineButtonClasses}>
          Filter
        </button>
      </form>

      <ReportError message={errorMessage} />

      {isLoading ? (
        <p className="mt-4 text-sm text-slate-400">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">No decided scholarship applications match this filter.</p>
      ) : (
        <ReportTable
          rowKey={(r) => r.applicationId}
          columns={[
            { header: "Applicant", render: (r) => <ApplicantCell name={r.applicantName} email={r.applicantEmail} /> },
            { header: "Scholarship", render: (r) => r.scholarshipName },
            { header: "Result", render: (r) => <StatusBadge status={r.status} /> },
            { header: "Decided", render: (r) => formatDate(r.decidedAt ?? r.submittedAt) },
            {
              header: "",
              render: (r) =>
                r.status === "Approved" && (
                  <Link
                    to={`/admin/reports/scholarship/${r.applicationId}/contract`}
                    className="font-semibold text-forest hover:underline"
                  >
                    View Contract
                  </Link>
                ),
            },
          ]}
          rows={rows}
        />
      )}
    </Card>
  );
}

function ScholarshipSlotsReport() {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { errorMessage, runReport } = useReportError();

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const data = await runReport(() => getScholarshipSlotReport());
      if (data) setRows(data);
      setIsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card>
      <h2 className="text-lg font-bold text-slate-900">Scholarship Slot Report</h2>

      <ReportError message={errorMessage} />

      {isLoading ? (
        <p className="mt-4 text-sm text-slate-400">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">No scholarships yet.</p>
      ) : (
        <ReportTable
          rowKey={(r) => r.scholarshipId}
          columns={[
            { header: "Scholarship", render: (r) => <ApplicantCell name={r.name} email={r.scholarshipType} /> },
            { header: "Total", render: (r) => r.totalSlots },
            { header: "Remaining", render: (r) => r.remainingSlots },
            { header: "Occupied", render: (r) => r.occupiedSlots },
            { header: "Status", render: (r) => <StatusBadge status={r.isActive ? "Active" : "Inactive"} /> },
          ]}
          rows={rows}
        />
      )}
    </Card>
  );
}

const REPORT_COMPONENTS = {
  enrollmentList: EnrollmentListReport,
  enrollmentSummary: EnrollmentSummaryReport,
  sectionFiles: SectionFilesReport,
  scholarshipApplicants: ScholarshipApplicantListReport,
  scholarshipQualification: ScholarshipQualificationReport,
  scholarshipResults: ScholarshipResultsReport,
  scholarshipSlots: ScholarshipSlotsReport,
};

export default function AdminReportsPage() {
  const [activeReport, setActiveReport] = useState("enrollmentList");
  const ActiveComponent = REPORT_COMPONENTS[activeReport];

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">Admissions & Scholarship data — SY 2025-2026</p>
        </div>
        <button type="button" onClick={() => window.print()} className={outlineButtonClasses}>
          ↓ Export PDF
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
        {["Admission", "Scholarship"].map((category) => (
          <div key={category}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{category}</p>
            <div className="flex flex-wrap gap-2">
              {REPORTS.filter((report) => report.category === category).map((report) => (
                <button
                  key={report.key}
                  type="button"
                  onClick={() => setActiveReport(report.key)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                    report.key === activeReport ? "bg-forest text-white" : "bg-white text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {report.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <ActiveComponent />
      </div>
    </AppShell>
  );
}
