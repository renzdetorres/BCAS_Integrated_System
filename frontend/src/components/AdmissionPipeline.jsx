import { useEffect, useState } from "react";
import { getAdmissionSummary } from "../api/admissionSummaryApi.js";
import { ApiError } from "../api/apiClient.js";
import FigureBars from "./ui/FigureBars.jsx";
import TrendChart from "./ui/TrendChart.jsx";
import "./AdmissionPipeline.css";

const FIGURES = [
  { key: "totalApplicants", label: "Total applicants" },
  { key: "tookExam", label: "Took the exam" },
  { key: "passed", label: "Passed the exam" },
  { key: "pending", label: "Pending", note: "Submitted, not yet reviewed" },
  { key: "underReview", label: "Under review" },
  { key: "forExam", label: "For entrance exam" },
  { key: "forInterview", label: "For interview" },
  { key: "failed", label: "Exam failed" },
  { key: "retake", label: "Retake" },
  { key: "enrolled", label: "Enrolled" },
];

// The first four are the headline figures, laid out exactly like the Scholarship summary
// (numbers plus a vertical bar graph).
const HEADLINE = FIGURES.slice(0, 4);

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

/** The admission process at a glance: the headline figures and five academic years of trend. */
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

      <dl className="pipeline-figures" style={{ "--figure-count": HEADLINE.length }}>
        {HEADLINE.map((figure) => (
          <div key={figure.key}>
            <dt>{figure.label}</dt>
            <dd>{summary[figure.key].toLocaleString()}</dd>
          </div>
        ))}
      </dl>

      <div className="pipeline-bars">
        <FigureBars label="Admission applicants as a bar graph" figures={HEADLINE.map((figure) => ({ label: figure.label, value: summary[figure.key] }))} />
      </div>

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
    </section>
  );
}
