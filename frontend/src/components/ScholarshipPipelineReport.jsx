import { useEffect, useState } from "react";
import { getScholarshipApplicants } from "../api/scholarshipPipelineApi.js";
import { ApiError } from "../api/apiClient.js";
import { Grantees } from "../pages/ScholarshipPipelinePage.jsx";
import DataTable, { PersonCell } from "./ui/DataTable.jsx";
import StatusBadge from "./ui/StatusBadge.jsx";

const EXAM_TONE = { Passed: "Approved", Failed: "Rejected", Taken: "UnderReview", Scheduled: "UnderReview", "Not yet": "Pending" };
const LEVELS = ["Grade 7", "Grade 11", "First Year College"];
const EXAM_STATUSES = ["Not yet", "Scheduled", "Taken", "Passed", "Failed"];

/** Scholarship applicants with their exam status and result, the qualified list, and the Top 10 grantees. */
export default function ScholarshipPipelineReport() {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [level, setLevel] = useState("");
  const [exam, setExam] = useState("");
  const [qualified, setQualified] = useState("");

  useEffect(() => {
    let cancelled = false;
    getScholarshipApplicants()
      .then((data) => {
        if (!cancelled) setRows(data);
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
  }, []);

  const shown = rows.filter(
    (row) =>
      (!level || row.level === level) &&
      (!exam || row.examStatus === exam) &&
      (!qualified || (qualified === "yes" ? row.qualifiedForInterview : !row.qualifiedForInterview)),
  );

  return (
    <>
      <DataTable
        title="Scholarship applicants, exam and result"
        titleAs="h2"
        subtitle="Every scholarship applicant with where they stand in the exam, and who is qualified for the interview and essay."
        columns={[
          {
            key: "applicant",
            header: "Applicant",
            accessor: (row) => `${row.applicantName} ${row.applicantEmail}`,
            sortable: true,
            render: (row) => <PersonCell name={row.applicantName} detail={row.applicantEmail} />,
          },
          {
            key: "level",
            header: "Level / program",
            accessor: (row) => `${row.level ?? ""} ${row.department ?? ""}`,
            sortable: true,
            render: (row) => <PersonCell name={row.level ?? "-"} detail={[row.department, row.scholarshipName].filter(Boolean).join(" · ")} />,
          },
          { key: "status", header: "Application status", accessor: (row) => row.status, sortable: true, render: (row) => <StatusBadge status={row.status} adminContext /> },
          {
            key: "exam",
            header: "Exam status",
            accessor: (row) => row.examStatus,
            sortable: true,
            render: (row) => <StatusBadge status={EXAM_TONE[row.examStatus] ?? "Pending"} label={row.examStatus} />,
          },
          {
            key: "qualified",
            header: "Interview / essay",
            accessor: (row) => (row.qualifiedForInterview ? "Qualified" : ""),
            sortable: true,
            render: (row) => (row.qualifiedForInterview ? <StatusBadge status="Qualified" /> : <span className="ui-cell-muted">-</span>),
          },
          {
            key: "score",
            header: "Score",
            align: "right",
            accessor: (row) => row.totalScore ?? -1,
            sortable: true,
            searchable: false,
            render: (row) => (row.totalScore != null ? row.totalScore.toFixed(2) : <span className="ui-cell-muted">-</span>),
          },
        ]}
        rows={shown}
        getRowKey={(row) => row.applicationId}
        isLoading={isLoading}
        errorMessage={errorMessage}
        emptyMessage="No scholarship applicants match these filters."
        searchPlaceholder="Search by applicant or scholarship"
        filters={[
          { key: "level", label: "All levels", value: level, onChange: setLevel, options: LEVELS.map((value) => ({ value, label: value })) },
          { key: "exam", label: "All exam statuses", value: exam, onChange: setExam, options: EXAM_STATUSES.map((value) => ({ value, label: value })) },
          {
            key: "qualified",
            label: "Interview / essay",
            value: qualified,
            onChange: setQualified,
            options: [
              { value: "yes", label: "Qualified" },
              { value: "no", label: "Not qualified yet" },
            ],
          },
        ]}
      />
      <Grantees />
    </>
  );
}
