import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import "./AdminReportsPage.css";

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
    <p className="form-error" role="alert">
      {message}
    </p>
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
    [runReport],
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
    <Card className="report-card">
      <div className="report-card-header">
        <h2>Enrollment List</h2>
        <button type="button" onClick={handleExport} disabled={isExporting}>
          {isExporting ? "Exporting..." : "Export to Excel"}
        </button>
      </div>
      <p className="report-subtitle">Approved admission applicants who have reserved their slot.</p>

      <form
        className="report-filters"
        onSubmit={(event) => {
          event.preventDefault();
          load(filters);
        }}
      >
        <input
          type="text"
          placeholder="Program"
          value={filters.program}
          onChange={(event) => setFilters((prev) => ({ ...prev, program: event.target.value }))}
        />
        <select
          value={filters.applicationType}
          onChange={(event) => setFilters((prev) => ({ ...prev, applicationType: event.target.value }))}
        >
          <option value="">All types</option>
          <option value="NewStudent">New Student</option>
          <option value="Transferee">Transferee</option>
        </select>
        <button type="submit">Filter</button>
      </form>

      <ReportError message={errorMessage} />

      {isLoading ? (
        <p>Loading...</p>
      ) : rows.length === 0 ? (
        <p>No enrolled applicants match these filters.</p>
      ) : (
        <table className="report-table">
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Type</th>
              <th>Program</th>
              <th>Submitted</th>
              <th>Reserved</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.applicationId}>
                <td>
                  <span className="report-name">{row.applicantName}</span>
                  <span className="report-email">{row.applicantEmail}</span>
                </td>
                <td>{row.applicationType}</td>
                <td>{row.courseAppliedFor}</td>
                <td>{formatDate(row.submittedAt)}</td>
                <td>{formatDate(row.reservedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
    <Card className="report-card">
      <div className="report-card-header">
        <h2>Summary of Enrollment</h2>
        <button type="button" onClick={handleExport} disabled={isExporting}>
          {isExporting ? "Exporting..." : "Export to Excel"}
        </button>
      </div>

      <ReportError message={errorMessage} />

      {isLoading ? (
        <p>Loading...</p>
      ) : summary ? (
        <>
          <p className="report-total">
            Total Enrolled: <strong>{summary.totalEnrolled}</strong>
          </p>
          <div className="report-summary-columns">
            <div>
              <h3>By Program</h3>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Program</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byProgram.map((entry) => (
                    <tr key={entry.program}>
                      <td>{entry.program}</td>
                      <td>{entry.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h3>By Application Type</h3>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byApplicationType.map((entry) => (
                    <tr key={entry.applicationType}>
                      <td>{entry.applicationType}</td>
                      <td>{entry.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
    <Card className="report-card">
      <div className="report-card-header">
        <h2>File per Section</h2>
        <button type="button" onClick={handleExport} disabled={isExporting}>
          {isExporting ? "Exporting..." : "Export to Excel"}
        </button>
      </div>
      <p className="report-subtitle">
        Enrolled applicants grouped by their applied-for course, used here as the section grouping.
      </p>

      <ReportError message={errorMessage} />

      {isLoading ? (
        <p>Loading...</p>
      ) : sections.length === 0 ? (
        <p>No enrolled applicants yet.</p>
      ) : (
        sections.map((section) => (
          <div key={section.section} className="report-section-group">
            <h3>{section.section}</h3>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Type</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {section.students.map((student) => (
                  <tr key={student.applicationId}>
                    <td>
                      <span className="report-name">{student.applicantName}</span>
                      <span className="report-email">{student.applicantEmail}</span>
                    </td>
                    <td>{student.applicationType}</td>
                    <td>{formatDate(student.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    [runReport],
  );

  useEffect(() => {
    load(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className="report-card">
      <h2>Scholarship Applicant List</h2>

      <form
        className="report-filters"
        onSubmit={(event) => {
          event.preventDefault();
          load(filters);
        }}
      >
        <input
          type="text"
          placeholder="Scholarship name"
          value={filters.scholarshipName}
          onChange={(event) => setFilters((prev) => ({ ...prev, scholarshipName: event.target.value }))}
        />
        <input
          type="text"
          placeholder="Status"
          value={filters.status}
          onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
        />
        <button type="submit">Filter</button>
      </form>

      <ReportError message={errorMessage} />

      {isLoading ? (
        <p>Loading...</p>
      ) : rows.length === 0 ? (
        <p>No scholarship applications match these filters.</p>
      ) : (
        <table className="report-table">
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Scholarship</th>
              <th>Grade Avg.</th>
              <th>Status</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.applicationId}>
                <td>
                  <span className="report-name">{row.applicantName}</span>
                  <span className="report-email">{row.applicantEmail}</span>
                </td>
                <td>{row.scholarshipName}</td>
                <td>{row.gradeAverage}</td>
                <td>
                  <StatusBadge status={row.status} />
                </td>
                <td>{formatDate(row.submittedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
    [runReport],
  );

  useEffect(() => {
    load(verdict);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className="report-card">
      <h2>Qualified / Not Qualified Applicants</h2>

      <form
        className="report-filters"
        onSubmit={(event) => {
          event.preventDefault();
          load(verdict);
        }}
      >
        <select value={verdict} onChange={(event) => setVerdict(event.target.value)}>
          <option value="">All verdicts</option>
          <option value="Qualified">Qualified</option>
          <option value="NotQualified">Not Qualified</option>
        </select>
        <button type="submit">Filter</button>
      </form>

      <ReportError message={errorMessage} />

      {isLoading ? (
        <p>Loading...</p>
      ) : rows.length === 0 ? (
        <p>No eligibility screenings match this filter.</p>
      ) : (
        <table className="report-table">
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Scholarship</th>
              <th>Verdict</th>
              <th>Evaluated By</th>
              <th>Evaluated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.applicationId}>
                <td>
                  <span className="report-name">{row.applicantName}</span>
                  <span className="report-email">{row.applicantEmail}</span>
                </td>
                <td>{row.scholarshipName}</td>
                <td>
                  <StatusBadge status={row.verdict} />
                </td>
                <td>{row.evaluatedByName}</td>
                <td>{formatDate(row.evaluatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
    [runReport],
  );

  useEffect(() => {
    load(decision);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className="report-card">
      <h2>Scholarship Results</h2>

      <form
        className="report-filters"
        onSubmit={(event) => {
          event.preventDefault();
          load(decision);
        }}
      >
        <select value={decision} onChange={(event) => setDecision(event.target.value)}>
          <option value="">All results</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
        <button type="submit">Filter</button>
      </form>

      <ReportError message={errorMessage} />

      {isLoading ? (
        <p>Loading...</p>
      ) : rows.length === 0 ? (
        <p>No decided scholarship applications match this filter.</p>
      ) : (
        <table className="report-table">
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Scholarship</th>
              <th>Result</th>
              <th>Decided</th>
              <th aria-hidden="true"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.applicationId}>
                <td>
                  <span className="report-name">{row.applicantName}</span>
                  <span className="report-email">{row.applicantEmail}</span>
                </td>
                <td>{row.scholarshipName}</td>
                <td>
                  <StatusBadge status={row.status} />
                </td>
                <td>{formatDate(row.decidedAt ?? row.submittedAt)}</td>
                <td>
                  {row.status === "Approved" && (
                    <Link className="report-contract-link" to={`/admin/reports/scholarship/${row.applicationId}/contract`}>
                      View Contract
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    <Card className="report-card">
      <h2>Scholarship Slot Report</h2>

      <ReportError message={errorMessage} />

      {isLoading ? (
        <p>Loading...</p>
      ) : rows.length === 0 ? (
        <p>No scholarships yet.</p>
      ) : (
        <table className="report-table">
          <thead>
            <tr>
              <th>Scholarship</th>
              <th>Total</th>
              <th>Remaining</th>
              <th>Occupied</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.scholarshipId}>
                <td>
                  <span className="report-name">{row.name}</span>
                  <span className="report-email">{row.scholarshipType}</span>
                </td>
                <td>{row.totalSlots}</td>
                <td>{row.remainingSlots}</td>
                <td>{row.occupiedSlots}</td>
                <td>
                  <StatusBadge status={row.isActive ? "Active" : "Inactive"} label={row.isActive ? "Active" : "Deactivated"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    <AppLayout title="Reports">
        <p className="admin-reports-subtitle">
          Admission and Scholarship reports. Admission reports can be exported to Excel; approved scholarship
          applications can be viewed and printed as a contract.
        </p>

        <nav className="admin-reports-nav">
          {["Admission", "Scholarship"].map((category) => (
            <div key={category} className="admin-reports-nav-group">
              <span className="admin-reports-nav-label">{category}</span>
              <div className="admin-reports-nav-buttons">
                {REPORTS.filter((report) => report.category === category).map((report) => (
                  <button
                    key={report.key}
                    type="button"
                    className={report.key === activeReport ? "report-tab report-tab-active" : "report-tab"}
                    onClick={() => setActiveReport(report.key)}
                  >
                    {report.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <ActiveComponent />
    </AppLayout>
  );
}
