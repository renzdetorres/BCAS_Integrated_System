import { useEffect, useState } from "react";
import { getApplicantStatusReport } from "../api/adminReportsApi.js";
import { ApiError } from "../api/apiClient.js";
import { ACADEMIC_CATEGORIES, SENIOR_HIGH_STRANDS, categoryFor } from "../config/academicStructure.js";
import { programsFor } from "../config/departments.js";
import { formatDate } from "../utils/format.js";
import Card from "./ui/Card.jsx";
import DataTable, { PersonCell } from "./ui/DataTable.jsx";
import StatusBadge from "./ui/StatusBadge.jsx";
import "./ApplicantStatusReport.css";

const TONE = {
  Pending: "Pending",
  Scheduled: "UnderReview",
  Completed: "Approved",
  Passed: "Approved",
  Failed: "Rejected",
  Retake: "Pending",
  ForEnrollment: "UnderReview",
  Enrolled: "Approved",
};

const LABEL = { ForEnrollment: "For enrollment" };

function academicYears(now = new Date()) {
  const start = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  return Array.from({ length: 5 }, (_, i) => `${start - 4 + i}-${start - 3 + i}`).reverse();
}

function Group({ title, items }) {
  return (
    <div className="status-group">
      <h3>{title}</h3>
      <dl>
        {items.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value.toLocaleString()}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Pill({ value }) {
  return value ? <StatusBadge status={TONE[value] ?? "Pending"} label={LABEL[value] ?? value} /> : <span className="ui-cell-muted">-</span>;
}

/** Admission results and applicant status: where applicants are in the exam, the interview and enrollment. */
export default function ApplicantStatusReport() {
  const [filters, setFilters] = useState({ dateFrom: "", dateTo: "", academicYear: "", department: "", yearLevel: "", program: "" });
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getApplicantStatusReport(filters)
      .then((data) => {
        if (cancelled) return;
        setReport(data);
        setErrorMessage(null);
      })
      .catch((error) => {
        if (!cancelled) setErrorMessage(error instanceof ApiError ? error.message : "Failed to load this report.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters]);

  function change(name, value) {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      // Level choices belong to the category, so changing it clears them.
      ...(name === "department" ? { yearLevel: "", program: "" } : {}),
    }));
  }

  const category = categoryFor(filters.department);
  const programs = programsFor(filters.department);
  const strands = category?.hasStrand ? SENIOR_HIGH_STRANDS : null;

  return (
    <>
      <Card>
        <h2 className="status-report-title">Applicant Status</h2>
        <p className="status-report-sub">
          Where each applicant stands in the entrance exam, the interview and enrollment. Use the filters to narrow it to a date range,
          academic year, level or program.
        </p>

        <div className="status-filters">
          <label>
            <span>From</span>
            <input type="date" value={filters.dateFrom} onChange={(e) => change("dateFrom", e.target.value)} />
          </label>
          <label>
            <span>To</span>
            <input type="date" value={filters.dateTo} onChange={(e) => change("dateTo", e.target.value)} />
          </label>
          <label>
            <span>Academic year</span>
            <select value={filters.academicYear} onChange={(e) => change("academicYear", e.target.value)}>
              <option value="">All years</option>
              {academicYears().map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Level</span>
            <select value={filters.department} onChange={(e) => change("department", e.target.value)}>
              <option value="">All levels</option>
              {ACADEMIC_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          {category && (
            <label>
              <span>{category.yearLevelLabel}</span>
              <select value={filters.yearLevel} onChange={(e) => change("yearLevel", e.target.value)}>
                <option value="">All</option>
                {category.yearLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </label>
          )}
          {(programs || strands) && (
            <label>
              <span>{programs ? "Program" : "Strand"}</span>
              <select value={filters.program} onChange={(e) => change("program", e.target.value)}>
                <option value="">All</option>
                {(programs ? programs.map((p) => p.code) : strands).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {errorMessage && (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        )}

        {report && (
          <div className="status-groups">
            <Group
              title="Examination"
              items={[
                ["Pending", report.exam.pending],
                ["Scheduled", report.exam.scheduled],
                ["Completed", report.exam.completed],
                ["Passed", report.exam.passed],
                ["Failed", report.exam.failed],
                ["Retake", report.exam.retake],
              ]}
            />
            <Group
              title="Interview"
              items={[
                ["Pending", report.interview.pending],
                ["Scheduled", report.interview.scheduled],
                ["Completed", report.interview.completed],
              ]}
            />
            <Group
              title="Enrollment"
              items={[
                ["Pending", report.enrollment.pending],
                ["For enrollment", report.enrollment.forEnrollment],
                ["Enrolled", report.enrollment.enrolled],
              ]}
            />
          </div>
        )}
      </Card>

      <DataTable
        title="Applicants"
        titleAs="h2"
        subtitle={report ? `${report.total.toLocaleString()} applicant${report.total === 1 ? "" : "s"} match the filters.` : undefined}
        columns={[
          {
            key: "applicant",
            header: "Applicant",
            accessor: (row) => `${row.applicantName} ${row.applicationNumber}`,
            sortable: true,
            render: (row) => <PersonCell name={row.applicantName} detail={row.applicationNumber} />,
          },
          {
            key: "level",
            header: "Level",
            accessor: (row) => `${row.department ?? ""} ${row.yearLevel ?? ""} ${row.courseAppliedFor}`,
            render: (row) => <PersonCell name={[row.department, row.yearLevel].filter(Boolean).join(" · ") || row.courseAppliedFor} detail={row.yearLevel ? row.courseAppliedFor : ""} />,
          },
          { key: "exam", header: "Exam", accessor: (row) => row.exam, sortable: true, render: (row) => <Pill value={row.exam} /> },
          { key: "interview", header: "Interview", accessor: (row) => row.interview, sortable: true, render: (row) => <Pill value={row.interview} /> },
          { key: "enrollment", header: "Enrollment", accessor: (row) => row.enrollment, sortable: true, render: (row) => <Pill value={row.enrollment} /> },
          { key: "submitted", header: "Applied", accessor: (row) => row.submittedAt, sortable: true, searchable: false, render: (row) => formatDate(row.submittedAt) },
        ]}
        rows={report?.rows ?? []}
        getRowKey={(row) => row.applicationId}
        isLoading={isLoading}
        emptyMessage="No applicants match these filters."
        searchPlaceholder="Search by applicant or application number"
      />
    </>
  );
}
