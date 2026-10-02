import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  exportEnrollmentList,
  exportEnrollmentSummary,
  exportSectionFiles,
  getApplicationFunnel,
  getApplicationTrend,
  getEnrollmentList,
  getEnrollmentSummary,
  getScholarshipApplicantList,
  getScholarshipQualificationList,
  getScholarshipResultList,
  getScholarshipSlotReport,
  getSectionFiles,
} from "../api/adminReportsApi.js";
import { SCHOLARSHIP_STATUSES } from "../api/adminApplicationsApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import DataTable, { PersonCell } from "../components/ui/DataTable.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import BarChart from "../components/ui/BarChart.jsx";
import TrendChart from "../components/ui/TrendChart.jsx";
import "./AdminReportsPage.css";

const REPORTS = [
  { key: "enrollmentList", category: "Admission", label: "Enrollment List" },
  { key: "enrollmentSummary", category: "Admission", label: "Summary of Enrollment" },
  { key: "sectionFiles", category: "Admission", label: "File per Section" },
  { key: "scholarshipApplicants", category: "Scholarship", label: "Scholarship Applicant List" },
  { key: "scholarshipQualification", category: "Scholarship", label: "Qualified / Not Qualified" },
  { key: "scholarshipResults", category: "Scholarship", label: "Scholarship Results" },
  { key: "scholarshipSlots", category: "Scholarship", label: "Scholarship Slot Report" },
  { key: "applicationTrend", category: "Trends", label: "Applications per Week" },
  { key: "applicationFunnel", category: "Trends", label: "Funnel / Drop-off" },
];

const TREND_SERIES = [
  { key: "admission", label: "Admission", color: "var(--color-primary)" },
  { key: "scholarship", label: "Scholarship", color: "var(--color-accent)" },
];

function formatWeekLabel(isoDate) {
  return new Date(isoDate).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const FUNNEL_STAGE_LABELS = {
  Submitted: "Submitted",
  UnderReview: "Under Review",
  DocumentsVerified: "Documents Verified",
  EligibilityScreening: "Eligibility Screening",
  Evaluation: "Evaluation",
  Result: "Result",
  Approved: "Approved",
  Rejected: "Rejected",
};

function formatDate(isoDateTime) {
  if (!isoDateTime) return "-";
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

const APPLICATION_TYPE_OPTIONS = [
  { value: "NewStudent", label: "New Student" },
  { value: "Transferee", label: "Transferee" },
];

function distinctOptions(rows, pick) {
  return [...new Set(rows.map(pick).filter(Boolean))].sort().map((value) => ({ value, label: value }));
}

function statusLabel(status) {
  return FUNNEL_STAGE_LABELS[status] ?? status;
}

/** Loads a report once; dropdowns then filter it in place so each change is instant. */
function useReportRows(loader) {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { errorMessage, runReport } = useReportError();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      const data = await runReport(loader);
      if (!cancelled && data) setRows(data);
      if (!cancelled) setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // Runs once per report: the loader is a fixed API call.
  }, [runReport]);

  return { rows, isLoading, errorMessage, runReport };
}

function EnrollmentListReport() {
  const { rows, isLoading, errorMessage, runReport } = useReportRows(() => getEnrollmentList({}));
  const [program, setProgram] = useState("");
  const [applicationType, setApplicationType] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const filtered = rows.filter(
    (row) => (!program || row.courseAppliedFor === program) && (!applicationType || row.applicationType === applicationType),
  );

  async function handleExport() {
    setIsExporting(true);
    await runReport(async () => {
      await exportEnrollmentList({ program, applicationType });
      return true;
    });
    setIsExporting(false);
  }

  return (
    <DataTable
      title="Enrollment List"
      titleAs="h2"
      subtitle="Approved admission applicants who have reserved their slot."
      actions={
        <button type="button" className="btn btn-secondary" onClick={handleExport} disabled={isExporting}>
          {isExporting ? "Exporting..." : "Export to Excel"}
        </button>
      }
      columns={[
        {
          key: "applicant",
          header: "Applicant",
          accessor: (row) => `${row.applicantName} ${row.applicantEmail}`,
          sortable: true,
          render: (row) => <PersonCell name={row.applicantName} detail={row.applicantEmail} />,
        },
        {
          key: "applicationType",
          header: "Type",
          accessor: (row) => APPLICATION_TYPE_OPTIONS.find((t) => t.value === row.applicationType)?.label ?? row.applicationType,
          sortable: true,
        },
        { key: "courseAppliedFor", header: "Program", sortable: true },
        { key: "submittedAt", header: "Submitted", sortable: true, searchable: false, render: (row) => formatDate(row.submittedAt) },
        { key: "reservedAt", header: "Reserved", sortable: true, searchable: false, render: (row) => formatDate(row.reservedAt) },
      ]}
      rows={filtered}
      getRowKey={(row) => row.applicationId}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyMessage="No enrolled applicants match these filters."
      searchPlaceholder="Search by applicant or email"
      filters={[
        {
          key: "program",
          label: "All programs",
          value: program,
          onChange: setProgram,
          options: distinctOptions(rows, (row) => row.courseAppliedFor),
        },
        {
          key: "applicationType",
          label: "All types",
          value: applicationType,
          onChange: setApplicationType,
          options: APPLICATION_TYPE_OPTIONS,
        },
      ]}
    />
  );
}

function ScholarshipApplicantListReport() {
  const { rows, isLoading, errorMessage } = useReportRows(() => getScholarshipApplicantList({}));
  const [scholarship, setScholarship] = useState("");
  const [status, setStatus] = useState("");

  const filtered = rows.filter(
    (row) => (!scholarship || row.scholarshipName === scholarship) && (!status || row.status === status),
  );

  return (
    <DataTable
      title="Scholarship Applicant List"
      titleAs="h2"
      subtitle="Every scholarship application, whatever its stage."
      columns={[
        {
          key: "applicant",
          header: "Applicant",
          accessor: (row) => `${row.applicantName} ${row.applicantEmail}`,
          sortable: true,
          render: (row) => <PersonCell name={row.applicantName} detail={row.applicantEmail} />,
        },
        { key: "scholarshipName", header: "Scholarship", sortable: true },
        { key: "gradeAverage", header: "Grade avg.", align: "right", sortable: true, searchable: false },
        {
          key: "status",
          header: "Status",
          accessor: (row) => statusLabel(row.status),
          sortable: true,
          render: (row) => <StatusBadge status={row.status} adminContext />,
        },
        { key: "submittedAt", header: "Submitted", sortable: true, searchable: false, render: (row) => formatDate(row.submittedAt) },
      ]}
      rows={filtered}
      getRowKey={(row) => row.applicationId}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyMessage="No scholarship applications match these filters."
      searchPlaceholder="Search by applicant or email"
      filters={[
        {
          key: "scholarship",
          label: "All scholarships",
          value: scholarship,
          onChange: setScholarship,
          options: distinctOptions(rows, (row) => row.scholarshipName),
        },
        {
          key: "status",
          label: "Any status",
          value: status,
          onChange: setStatus,
          options: SCHOLARSHIP_STATUSES.map((value) => ({ value, label: statusLabel(value) })),
        },
      ]}
    />
  );
}

function ScholarshipQualificationReport() {
  const { rows, isLoading, errorMessage } = useReportRows(() => getScholarshipQualificationList({}));
  const [scholarship, setScholarship] = useState("");
  const [verdict, setVerdict] = useState("");

  const filtered = rows.filter(
    (row) => (!scholarship || row.scholarshipName === scholarship) && (!verdict || row.verdict === verdict),
  );

  return (
    <DataTable
      title="Qualified / Not Qualified Applicants"
      titleAs="h2"
      subtitle="Every eligibility screening an Evaluator has recorded."
      columns={[
        {
          key: "applicant",
          header: "Applicant",
          accessor: (row) => `${row.applicantName} ${row.applicantEmail}`,
          sortable: true,
          render: (row) => <PersonCell name={row.applicantName} detail={row.applicantEmail} />,
        },
        { key: "scholarshipName", header: "Scholarship", sortable: true },
        {
          key: "verdict",
          header: "Verdict",
          sortable: true,
          render: (row) => <StatusBadge status={row.verdict} />,
        },
        { key: "evaluatedByName", header: "Evaluated by", sortable: true },
        { key: "evaluatedAt", header: "Evaluated", sortable: true, searchable: false, render: (row) => formatDate(row.evaluatedAt) },
      ]}
      rows={filtered}
      getRowKey={(row) => row.applicationId}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyMessage="No eligibility screenings match these filters."
      searchPlaceholder="Search by applicant or evaluator"
      filters={[
        {
          key: "scholarship",
          label: "All scholarships",
          value: scholarship,
          onChange: setScholarship,
          options: distinctOptions(rows, (row) => row.scholarshipName),
        },
        {
          key: "verdict",
          label: "Any verdict",
          value: verdict,
          onChange: setVerdict,
          options: [
            { value: "Qualified", label: "Qualified" },
            { value: "NotQualified", label: "Not Qualified" },
          ],
        },
      ]}
    />
  );
}

function ScholarshipResultsReport() {
  const { rows, isLoading, errorMessage } = useReportRows(() => getScholarshipResultList({}));
  const [scholarship, setScholarship] = useState("");
  const [decision, setDecision] = useState("");

  const filtered = rows.filter(
    (row) => (!scholarship || row.scholarshipName === scholarship) && (!decision || row.status === decision),
  );

  return (
    <DataTable
      title="Scholarship Results"
      titleAs="h2"
      subtitle="Decided scholarship applications. An approved one has a printable contract."
      columns={[
        {
          key: "applicant",
          header: "Applicant",
          accessor: (row) => `${row.applicantName} ${row.applicantEmail}`,
          sortable: true,
          render: (row) => <PersonCell name={row.applicantName} detail={row.applicantEmail} />,
        },
        { key: "scholarshipName", header: "Scholarship", sortable: true },
        { key: "status", header: "Result", sortable: true, render: (row) => <StatusBadge status={row.status} /> },
        {
          key: "decidedAt",
          header: "Decided",
          accessor: (row) => row.decidedAt ?? row.submittedAt,
          sortable: true,
          searchable: false,
          render: (row) => formatDate(row.decidedAt ?? row.submittedAt),
        },
        {
          key: "action",
          header: "Action",
          align: "right",
          searchable: false,
          render: (row) =>
            row.status === "Approved" ? (
              <Link className="ui-datatable-row-action" to={`/admin/reports/scholarship/${row.applicationId}/contract`}>
                View contract
              </Link>
            ) : (
              <span className="ui-cell-muted">-</span>
            ),
        },
      ]}
      rows={filtered}
      getRowKey={(row) => row.applicationId}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyMessage="No decided scholarship applications match these filters."
      searchPlaceholder="Search by applicant or email"
      filters={[
        {
          key: "scholarship",
          label: "All scholarships",
          value: scholarship,
          onChange: setScholarship,
          options: distinctOptions(rows, (row) => row.scholarshipName),
        },
        {
          key: "decision",
          label: "Any result",
          value: decision,
          onChange: setDecision,
          options: [
            { value: "Approved", label: "Approved" },
            { value: "Rejected", label: "Rejected" },
          ],
        },
      ]}
    />
  );
}

function ScholarshipSlotsReport() {
  const { rows, isLoading, errorMessage } = useReportRows(() => getScholarshipSlotReport());
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");

  const filtered = rows.filter(
    (row) =>
      (!status || (status === "active" ? row.isActive : !row.isActive)) && (!type || row.scholarshipType === type),
  );

  return (
    <DataTable
      title="Scholarship Slot Report"
      titleAs="h2"
      subtitle="Slots per scholarship: how many are filled and how many remain."
      columns={[
        {
          key: "name",
          header: "Scholarship",
          accessor: (row) => `${row.name} ${row.scholarshipType}`,
          sortable: true,
          render: (row) => <PersonCell name={row.name} detail={row.scholarshipType} />,
        },
        { key: "totalSlots", header: "Total", align: "right", sortable: true, searchable: false },
        { key: "occupiedSlots", header: "Filled", align: "right", sortable: true, searchable: false },
        { key: "remainingSlots", header: "Remaining", align: "right", sortable: true, searchable: false },
        {
          key: "status",
          header: "Status",
          accessor: (row) => (row.isActive ? "Active" : "Deactivated"),
          sortable: true,
          render: (row) => (
            <StatusBadge status={row.isActive ? "Active" : "Inactive"} label={row.isActive ? "Active" : "Deactivated"} />
          ),
        },
      ]}
      rows={filtered}
      getRowKey={(row) => row.scholarshipId}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyMessage="No scholarships match these filters."
      searchPlaceholder="Search by scholarship"
      filters={[
        {
          key: "type",
          label: "All types",
          value: type,
          onChange: setType,
          options: distinctOptions(rows, (row) => row.scholarshipType),
        },
        {
          key: "status",
          label: "Any status",
          value: status,
          onChange: setStatus,
          options: [
            { value: "active", label: "Active" },
            { value: "inactive", label: "Deactivated" },
          ],
        },
      ]}
    />
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
          <BarChart
            data={summary.byProgram.map((entry) => ({ label: entry.program, value: entry.count }))}
            emptyMessage="No enrolled applicants yet."
          />
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

function ApplicationTrendReport() {
  const [weeks, setWeeks] = useState(12);
  const [trend, setTrend] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { errorMessage, runReport } = useReportError();

  const load = useCallback(
    async (activeWeeks) => {
      setIsLoading(true);
      const data = await runReport(() => getApplicationTrend({ weeks: activeWeeks }));
      if (data) setTrend(data);
      setIsLoading(false);
    },
    [runReport],
  );

  useEffect(() => {
    load(weeks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chartData = trend?.weekly.map((point) => ({
    label: formatWeekLabel(point.weekStart),
    values: { admission: point.admissionCount, scholarship: point.scholarshipCount },
  }));

  const totalAdmission = trend?.weekly.reduce((sum, p) => sum + p.admissionCount, 0) ?? 0;
  const totalScholarship = trend?.weekly.reduce((sum, p) => sum + p.scholarshipCount, 0) ?? 0;

  return (
    <Card className="report-card">
      <h2>Applications per Week</h2>
      <p className="report-subtitle">
        Admission and Scholarship applications submitted each week, most recent {weeks} weeks. Useful for spotting
        intake volume trends - a snapshot total doesn't show whether this week is busier than last.
      </p>

      <form
        className="report-filters"
        onSubmit={(event) => {
          event.preventDefault();
          load(weeks);
        }}
      >
        <select value={weeks} onChange={(event) => setWeeks(Number(event.target.value))}>
          <option value={4}>Last 4 weeks</option>
          <option value={8}>Last 8 weeks</option>
          <option value={12}>Last 12 weeks</option>
          <option value={26}>Last 26 weeks</option>
        </select>
        <button type="submit">Apply</button>
      </form>

      <ReportError message={errorMessage} />

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <>
          <p className="report-total">
            Total: <strong>{totalAdmission}</strong> Admission, <strong>{totalScholarship}</strong> Scholarship
          </p>
          <TrendChart data={chartData} series={TREND_SERIES} emptyMessage="No applications in this period." />
        </>
      )}
    </Card>
  );
}

function ApplicationFunnelReport() {
  const [funnel, setFunnel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { errorMessage, runReport } = useReportError();

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const data = await runReport(() => getApplicationFunnel());
      if (data) setFunnel(data);
      setIsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className="report-card">
      <h2>Funnel / Drop-off</h2>
      <p className="report-subtitle">
        How many applications ever reached each stage of the workflow, in order. The gap between two bars is how
        many applications dropped off between those stages - not every Submitted application reaches a final
        decision.
      </p>

      <ReportError message={errorMessage} />

      {isLoading ? (
        <p>Loading...</p>
      ) : funnel ? (
        <div className="report-summary-columns">
          <div>
            <h3>Admission</h3>
            <BarChart
              data={funnel.admissionFunnel.map((s) => ({ label: FUNNEL_STAGE_LABELS[s.stage] ?? s.stage, value: s.count }))}
              emptyMessage="No admission applications yet."
            />
          </div>
          <div>
            <h3>Scholarship</h3>
            <BarChart
              data={funnel.scholarshipFunnel.map((s) => ({ label: FUNNEL_STAGE_LABELS[s.stage] ?? s.stage, value: s.count }))}
              emptyMessage="No scholarship applications yet."
            />
          </div>
        </div>
      ) : null}
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
  applicationTrend: ApplicationTrendReport,
  applicationFunnel: ApplicationFunnelReport,
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
          {["Admission", "Scholarship", "Trends"].map((category) => (
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
