import { useEffect, useState } from "react";
import { getScholarshipApplicants } from "../api/scholarshipPipelineApi.js";
import { ApiError } from "../api/apiClient.js";
import DataTable, { PersonCell } from "./ui/DataTable.jsx";
import StatusBadge from "./ui/StatusBadge.jsx";

const EXAM_TONE = { Passed: "Approved", Failed: "Rejected", Taken: "UnderReview", Scheduled: "UnderReview", "Not yet": "Pending" };
const distinct = (rows, pick) => [...new Set(rows.map(pick).filter(Boolean))].sort().map((value) => ({ value, label: value }));

function useScholarshipRows() {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

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

  return { rows, isLoading, errorMessage };
}

const applicantColumn = {
  key: "applicant",
  header: "Applicant",
  accessor: (row) => `${row.applicantName} ${row.applicantEmail}`,
  sortable: true,
  render: (row) => <PersonCell name={row.applicantName} detail={row.applicantEmail} />,
};

const levelColumn = {
  key: "level",
  header: "Level / program",
  accessor: (row) => `${row.level ?? ""} ${row.department ?? ""}`,
  sortable: true,
  render: (row) => <PersonCell name={row.level ?? "-"} detail={[row.department, row.scholarshipName].filter(Boolean).join(" · ")} />,
};

const scoreColumn = {
  key: "score",
  header: "Score",
  accessor: (row) => row.totalScore ?? -1,
  sortable: true,
  searchable: false,
  render: (row) => (row.totalScore != null ? row.totalScore.toFixed(2) : <span className="ui-cell-muted">-</span>),
};

/** Scholarship applicants who passed the exam and are qualified for the interview and essay. */
export function ScholarshipQualifiedReport() {
  const { rows, isLoading, errorMessage } = useScholarshipRows();
  const [level, setLevel] = useState("");
  const [program, setProgram] = useState("");

  const qualified = rows.filter((row) => row.qualifiedForInterview);
  const shown = qualified.filter((row) => (!level || row.level === level) && (!program || row.department === program));

  return (
    <DataTable
      title="Qualified Applicants"
      titleAs="h2"
      subtitle="Scholarship applicants who passed the exam and are qualified for the interview and essay."
      columns={[
        applicantColumn,
        levelColumn,
        {
          key: "exam",
          header: "Exam result",
          accessor: (row) => row.examStatus,
          sortable: true,
          render: (row) => <StatusBadge status={EXAM_TONE[row.examStatus] ?? "Pending"} label={row.examStatus} />,
        },
        { key: "qualified", header: "Interview / essay", searchable: false, render: () => <StatusBadge status="Qualified" /> },
      ]}
      rows={shown}
      getRowKey={(row) => row.applicationId}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyMessage="No applicants are qualified for the interview and essay yet."
      searchPlaceholder="Search by applicant or scholarship"
      filters={[
        { key: "level", label: "All levels", value: level, onChange: setLevel, options: distinct(qualified, (row) => row.level) },
        { key: "program", label: "All programs", value: program, onChange: setProgram, options: distinct(qualified, (row) => row.department) },
      ]}
    />
  );
}

/** The scholarship's grantees, by level or program. */
export function ScholarshipGranteesReport() {
  const { rows, isLoading, errorMessage } = useScholarshipRows();
  const [level, setLevel] = useState("");
  const [program, setProgram] = useState("");

  const grantees = rows.filter((row) => row.status === "Approved");
  const shown = grantees.filter((row) => (!level || row.level === level) && (!program || row.department === program));

  return (
    <DataTable
      title="Scholarship Grantees"
      titleAs="h2"
      subtitle="Approved scholarship grantees. Filter by level or program."
      summary={[{ label: "Grantees", value: shown.length.toLocaleString(), tone: "green" }]}
      columns={[
        applicantColumn,
        levelColumn,
        scoreColumn,
        { key: "status", header: "Status", accessor: (row) => row.status, sortable: true, render: (row) => <StatusBadge status={row.status} adminContext /> },
      ]}
      rows={shown}
      getRowKey={(row) => row.applicationId}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyMessage="No grantees match these filters yet."
      searchPlaceholder="Search by applicant or scholarship"
      filters={[
        { key: "level", label: "All levels", value: level, onChange: setLevel, options: distinct(grantees, (row) => row.level) },
        { key: "program", label: "All programs", value: program, onChange: setProgram, options: distinct(grantees, (row) => row.department) },
      ]}
    />
  );
}
