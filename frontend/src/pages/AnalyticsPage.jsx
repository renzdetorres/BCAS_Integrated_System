import AppLayout from "../components/layout/AppLayout.jsx";
import Card, { StatCard } from "../components/ui/Card.jsx";
import LineChart from "../components/ui/LineChart.jsx";
import BarChart from "../components/ui/BarChart.jsx";
import DonutChart from "../components/ui/DonutChart.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import "./AnalyticsPage.css";

// DEMO DATA - this page is a preview, not wired to a real endpoint yet.
// Shape mirrors what AdminDashboardPage already gets from
// GET /api/admin/dashboard, so swapping these constants for a real fetch
// (e.g. GET /api/admin/analytics) is a drop-in change, not a rewrite.

const TREND_CATEGORIES = ["Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];
const TREND_SERIES = [
  { label: "Admission Applications", color: "var(--color-primary)", values: [62, 74, 81, 95, 88, 102, 118, 96] },
  { label: "Scholarship Applications", color: "var(--color-accent-dark)", values: [20, 28, 24, 33, 41, 38, 52, 47] },
];

const APPLICANTS_BY_PROGRAM = [
  { label: "BS Computer Science", value: 184 },
  { label: "BS Accountancy", value: 151 },
  { label: "BS Nursing", value: 142 },
  { label: "BS Psychology", value: 98 },
  { label: "BS Criminology", value: 76 },
  { label: "Bachelor of Education", value: 54 },
];

const SCREENING_OUTCOMES = [
  { label: "Qualified", value: 231, color: "var(--color-status-green-text)" },
  { label: "Not Qualified", value: 64, color: "var(--color-status-red-text)" },
  { label: "Pending", value: 89, color: "var(--color-accent)" },
];

const PROGRAM_PERFORMANCE = [
  { program: "BS Computer Science", applicants: 184, approved: 149, rate: 0.81 },
  { program: "BS Accountancy", applicants: 151, approved: 112, rate: 0.74 },
  { program: "BS Nursing", applicants: 142, approved: 97, rate: 0.68 },
  { program: "BS Psychology", applicants: 98, approved: 79, rate: 0.81 },
  { program: "BS Criminology", applicants: 76, approved: 51, rate: 0.67 },
  { program: "Bachelor of Education", applicants: 54, approved: 44, rate: 0.81 },
];

const columns = [
  { key: "program", header: "Program", accessor: (row) => row.program, sortable: true },
  { key: "applicants", header: "Applicants", accessor: (row) => row.applicants, sortable: true },
  { key: "approved", header: "Approved", accessor: (row) => row.approved, sortable: true },
  {
    key: "rate",
    header: "Approval Rate",
    accessor: (row) => row.rate,
    sortable: true,
    render: (row) => `${Math.round(row.rate * 100)}%`,
  },
];

export default function AnalyticsPage() {
  return (
    <AppLayout title="Analytics">
      <p className="analytics-subtitle">
        Admissions and scholarship trends across the current intake cycle. Preview data - not yet connected to live
        figures.
      </p>

      <section className="admin-stat-grid">
        <StatCard label="Avg. Days to Decision" value="12" />
        <StatCard label="Document Verification Rate" value="91%" />
        <StatCard label="Exam Attendance Rate" value="87%" />
        <StatCard label="Scholarship Approval Rate" value="64%" />
      </section>

      <div className="analytics-charts">
        <Card>
          <h2>Applications Received</h2>
          <LineChart categories={TREND_CATEGORIES} series={TREND_SERIES} />
        </Card>

        <Card>
          <h2>Screening Outcomes</h2>
          <DonutChart centerLabel="Screened" segments={SCREENING_OUTCOMES} />
        </Card>
      </div>

      <div className="analytics-charts">
        <Card>
          <h2>Applicants by Program</h2>
          <BarChart data={APPLICANTS_BY_PROGRAM} />
        </Card>

        <Card>
          <h2>Top Programs by Volume</h2>
          <p className="analytics-meta">The three programs driving most of this cycle's admission traffic.</p>
          <ul className="analytics-highlight-list">
            {APPLICANTS_BY_PROGRAM.slice(0, 3).map((program, index) => (
              <li key={program.label}>
                <span className="analytics-highlight-rank">{index + 1}</span>
                <span className="analytics-highlight-label">{program.label}</span>
                <span className="analytics-highlight-value">{program.value}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <h2>Program Performance</h2>
        <DataTable columns={columns} rows={PROGRAM_PERFORMANCE} getRowKey={(row) => row.program} />
      </Card>
    </AppLayout>
  );
}
