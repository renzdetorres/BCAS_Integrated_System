import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdmissionSummary } from "../api/admissionSummaryApi.js";
import { ApiError } from "../api/apiClient.js";
import { APPLICATION_TYPE_LABELS } from "../api/admissionApi.js";
import { formatDate } from "../utils/format.js";
import StatusBadge from "./ui/StatusBadge.jsx";
import TrendChart from "./ui/TrendChart.jsx";
import "./AdmissionPipeline.css";

const FIGURES = [
  { key: "totalApplicants", label: "Total applicants" },
  { key: "pending", label: "Pending", note: "Submitted, not yet reviewed" },
  { key: "underReview", label: "Under review" },
  { key: "forExam", label: "For entrance exam" },
  { key: "forInterview", label: "For interview" },
  { key: "passed", label: "Exam passed" },
  { key: "failed", label: "Exam failed" },
  { key: "retake", label: "Retake" },
  { key: "enrolled", label: "Enrolled" },
];

const SERIES = [
  { key: "applicants", label: "Applicants", color: "var(--color-primary-light)" },
  { key: "enrolled", label: "Enrolled", color: "var(--color-accent)" },
];

const COLLEGE_SERIES = [
  { key: "first", label: "1st semester", color: "var(--color-primary-light)" },
  { key: "second", label: "2nd semester", color: "var(--color-accent)" },
  { key: "summer", label: "Summer", color: "var(--color-text-tertiary)" },
];

/** "2026-2027" -> "26-27": five full years do not fit under their bars. */
function shortYear(year) {
  return `${year.slice(2, 4)}-${year.slice(7)}`;
}

function collegeData(points, years) {
  return years.map((year) => {
    const count = (term) => points.filter((p) => p.academicYear === year && p.semester === term).reduce((sum, p) => sum + p.applicants, 0);
    return {
      label: shortYear(year),
      values: { first: count("1st Semester"), second: count("2nd Semester"), summer: count("Summer") },
    };
  });
}

/** The admission process at a glance: where applicants are, who applied last, and five academic years of trend. */
export default function AdmissionPipeline({ academicYear = "" }) {
  const [summary, setSummary] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getAdmissionSummary(academicYear)
      .then((data) => {
        if (cancelled) return;
        setSummary(data);
        setErrorMessage(null);
      })
      .catch((error) => {
        if (!cancelled) setErrorMessage(error instanceof ApiError ? error.message : "Failed to load the admission summary.");
      });
    return () => {
      cancelled = true;
    };
  }, [academicYear]);

  if (errorMessage) {
    return (
      <p className="form-error" role="alert">
        {errorMessage}
      </p>
    );
  }

  if (!summary) return <div className="dash-skeleton pipeline-skeleton" aria-busy="true" aria-label="Loading admission summary" />;

  const hasCollege = summary.collegeTrend.length > 0;

  return (
    <section className="dash-panel pipeline" aria-labelledby="pipeline-title">
      <div className="dash-panel-head">
        <h2 id="pipeline-title" className="dash-panel-title">
          Admission summary
        </h2>
        <span className="pipeline-year-note">{academicYear ? `Academic year ${academicYear}` : "All academic years"}</span>
      </div>

      <dl className="pipeline-figures">
        {FIGURES.map((figure) => (
          <div key={figure.key}>
            <dt>{figure.label}</dt>
            <dd>{summary[figure.key].toLocaleString()}</dd>
          </div>
        ))}
      </dl>

      <div className="pipeline-charts">
        <div>
          <h3 className="pipeline-subtitle">Applicants and enrolled, last 5 academic years</h3>
          <TrendChart
            data={summary.trend.map((point) => ({ label: shortYear(point.academicYear), values: { applicants: point.applicants, enrolled: point.enrolled } }))}
            series={SERIES}
          />
        </div>
        {hasCollege && (
          <div>
            <h3 className="pipeline-subtitle">College applicants by semester</h3>
            <TrendChart data={collegeData(summary.collegeTrend, summary.academicYears)} series={COLLEGE_SERIES} />
          </div>
        )}
      </div>

      <div className="pipeline-latest">
          <h3 className="pipeline-subtitle">Latest applicants</h3>
          {summary.latest.length === 0 ? (
            <p className="dash-empty">No applicants for this selection.</p>
          ) : (
            <div className="dash-table-scroll">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th scope="col">Applicant</th>
                    <th scope="col">Level</th>
                    <th scope="col">Type</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="dash-table-date">
                      Applied
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summary.latest.map((applicant) => (
                    <tr key={applicant.applicationId}>
                      <td>
                        <Link to={`/admin/applications/${applicant.applicationId}`} className="dash-table-name">
                          {applicant.applicantName}
                        </Link>
                        <span className="dash-table-sub">{applicant.applicationNumber}</span>
                      </td>
                      <td>
                        {[applicant.department, applicant.yearLevel].filter(Boolean).join(" · ") || applicant.courseAppliedFor}
                      </td>
                      <td>{APPLICATION_TYPE_LABELS[applicant.applicationType] ?? applicant.applicationType}</td>
                      <td>
                        <StatusBadge status={applicant.status} adminContext />
                      </td>
                      <td className="dash-table-date">{formatDate(applicant.submittedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </section>
  );
}
