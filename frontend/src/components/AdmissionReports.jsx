import { useEffect, useState } from "react";
import { getApplicantStatusReport } from "../api/adminReportsApi.js";
import { ApiError } from "../api/apiClient.js";
import { ACADEMIC_CATEGORIES } from "../config/academicStructure.js";
import { formatDate } from "../utils/format.js";
import DataTable, { PersonCell } from "./ui/DataTable.jsx";
import StatusBadge from "./ui/StatusBadge.jsx";

// These reports all read the same per-applicant rows the Applicant Status report
// does (exam, interview and enrollment standing), so the figures can never disagree.

const RESULT_TONE = { Passed: "Approved", Failed: "Rejected", Retake: "Pending" };
const ENROLLMENT_LABEL = { ForEnrollment: "For enrollment", Enrolled: "Enrolled", Pending: "Pending" };
const ENROLLMENT_TONE = { ForEnrollment: "UnderReview", Enrolled: "Approved", Pending: "Pending" };

const levelLabel = (department) => ACADEMIC_CATEGORIES.find((c) => c.value === department)?.label ?? department ?? "Level not set";
const levelOrder = (department) => {
  const index = ACADEMIC_CATEGORIES.findIndex((c) => c.value === department);
  return index === -1 ? ACADEMIC_CATEGORIES.length : index;
};
const distinct = (rows, pick) => [...new Set(rows.map(pick).filter(Boolean))].sort().map((value) => ({ value, label: value }));

function useApplicantStatusRows() {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getApplicantStatusReport({})
      .then((data) => {
        if (!cancelled) setRows(data.rows ?? []);
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
  accessor: (row) => `${row.applicantName} ${row.applicationNumber ?? ""}`,
  sortable: true,
  render: (row) => <PersonCell name={row.applicantName} detail={row.applicationNumber} />,
};

const appliedForColumn = {
  key: "level",
  header: "Applied for",
  accessor: (row) => `${row.department ?? ""} ${row.yearLevel ?? ""} ${row.courseAppliedFor}`,
  render: (row) => <PersonCell name={row.courseAppliedFor} detail={[levelLabel(row.department), row.yearLevel].filter(Boolean).join(" · ")} />,
};

/** Applicants who passed the interview and can go on to enrollment. */
export function AdmissionListReport() {
  const { rows, isLoading, errorMessage } = useApplicantStatusRows();
  const [enrollment, setEnrollment] = useState("");
  const [level, setLevel] = useState("");
  const [appliedFor, setAppliedFor] = useState("");

  const eligible = rows.filter((row) => row.enrollment === "ForEnrollment" || row.enrollment === "Enrolled");
  const shown = eligible.filter(
    (row) => (!enrollment || row.enrollment === enrollment) && (!level || row.department === level) && (!appliedFor || row.courseAppliedFor === appliedFor),
  );

  return (
    <DataTable
      title="Admission List"
      titleAs="h2"
      subtitle="Applicants who passed the exam and the interview and can proceed to enrollment."
      columns={[
        applicantColumn,
        appliedForColumn,
        {
          key: "enrollment",
          header: "Status",
          accessor: (row) => ENROLLMENT_LABEL[row.enrollment] ?? row.enrollment,
          sortable: true,
          render: (row) => <StatusBadge status={ENROLLMENT_TONE[row.enrollment] ?? "Pending"} label={ENROLLMENT_LABEL[row.enrollment] ?? row.enrollment} />,
        },
        { key: "submitted", header: "Applied", accessor: (row) => row.submittedAt, sortable: true, searchable: false, render: (row) => formatDate(row.submittedAt) },
      ]}
      rows={shown}
      getRowKey={(row) => row.applicationId}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyMessage="No applicants are ready for enrollment yet."
      searchPlaceholder="Search by applicant or application number"
      filters={[
        {
          key: "enrollment",
          label: "All statuses",
          value: enrollment,
          onChange: setEnrollment,
          options: [
            { value: "ForEnrollment", label: "For enrollment" },
            { value: "Enrolled", label: "Enrolled" },
          ],
        },
        {
          key: "level",
          label: "All levels",
          value: level,
          onChange: setLevel,
          options: ACADEMIC_CATEGORIES.filter((c) => eligible.some((row) => row.department === c.value)).map((c) => ({ value: c.value, label: c.label })),
        },
        { key: "appliedFor", label: "All applied for", value: appliedFor, onChange: setAppliedFor, options: distinct(eligible, (row) => row.courseAppliedFor) },
      ]}
    />
  );
}

/** Admission figures per academic level. */
export function AdmissionPerLevelReport() {
  const { rows, isLoading, errorMessage } = useApplicantStatusRows();

  const grouped = new Map();
  for (const row of rows) {
    const key = row.department ?? "";
    if (!grouped.has(key)) grouped.set(key, { key, level: levelLabel(row.department), order: levelOrder(row.department), applicants: 0, passed: 0, retake: 0, failed: 0, forEnrollment: 0, enrolled: 0 });
    const group = grouped.get(key);
    group.applicants += 1;
    if (row.exam === "Passed") group.passed += 1;
    if (row.exam === "Retake") group.retake += 1;
    if (row.exam === "Failed") group.failed += 1;
    if (row.enrollment === "ForEnrollment") group.forEnrollment += 1;
    if (row.enrollment === "Enrolled") group.enrolled += 1;
  }
  const levels = [...grouped.values()].sort((a, b) => a.order - b.order);
  const total = (field) => levels.reduce((sum, group) => sum + group[field], 0);
  const number = (field) => ({ key: field, align: "right", sortable: true, searchable: false });

  return (
    <DataTable
      title="Admission per Level"
      titleAs="h2"
      subtitle="Admission statistics grouped by academic level."
      summary={[
        { label: "Applicants", value: total("applicants").toLocaleString() },
        { label: "Passed the exam", value: total("passed").toLocaleString(), tone: "green" },
        { label: "For enrollment", value: total("forEnrollment").toLocaleString(), tone: "amber" },
        { label: "Enrolled", value: total("enrolled").toLocaleString(), tone: "green" },
      ]}
      columns={[
        { key: "level", header: "Level", sortable: true },
        { ...number("applicants"), header: "Applicants" },
        { ...number("passed"), header: "Passed" },
        { ...number("retake"), header: "Retake" },
        { ...number("failed"), header: "Failed" },
        { ...number("forEnrollment"), header: "For enrollment" },
        { ...number("enrolled"), header: "Enrolled" },
      ]}
      rows={levels}
      getRowKey={(row) => row.key}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyMessage="No admission applications yet."
      pageSize={25}
    />
  );
}

/** Each applicant's entrance exam result: Passed, Retake or Failed. */
export function AdmissionResultsReport() {
  const { rows, isLoading, errorMessage } = useApplicantStatusRows();
  const [result, setResult] = useState("");
  const [level, setLevel] = useState("");
  const [appliedFor, setAppliedFor] = useState("");

  const withResult = rows.filter((row) => row.exam in RESULT_TONE);
  const count = (value) => withResult.filter((row) => row.exam === value).length;
  const shown = withResult.filter(
    (row) => (!result || row.exam === result) && (!level || row.department === level) && (!appliedFor || row.courseAppliedFor === appliedFor),
  );

  return (
    <DataTable
      title="Admission Results"
      titleAs="h2"
      subtitle="Applicants who took the entrance exam, grouped by Passed, Retake or Failed."
      summary={[
        { label: "Passed", value: count("Passed").toLocaleString(), tone: "green", onClick: () => setResult(result === "Passed" ? "" : "Passed"), active: result === "Passed" },
        { label: "Retake", value: count("Retake").toLocaleString(), tone: "amber", onClick: () => setResult(result === "Retake" ? "" : "Retake"), active: result === "Retake" },
        { label: "Failed", value: count("Failed").toLocaleString(), tone: "red", onClick: () => setResult(result === "Failed" ? "" : "Failed"), active: result === "Failed" },
      ]}
      summaryNote="Select a count to filter the list."
      columns={[
        applicantColumn,
        appliedForColumn,
        {
          key: "exam",
          header: "Result",
          accessor: (row) => row.exam,
          sortable: true,
          render: (row) => <StatusBadge status={RESULT_TONE[row.exam]} label={row.exam} />,
        },
        { key: "submitted", header: "Applied", accessor: (row) => row.submittedAt, sortable: true, searchable: false, render: (row) => formatDate(row.submittedAt) },
      ]}
      rows={shown}
      getRowKey={(row) => row.applicationId}
      isLoading={isLoading}
      errorMessage={errorMessage}
      emptyMessage="No exam results match these filters."
      searchPlaceholder="Search by applicant or application number"
      filters={[
        {
          key: "result",
          label: "All results",
          value: result,
          onChange: setResult,
          options: [
            { value: "Passed", label: "Passed" },
            { value: "Retake", label: "Retake" },
            { value: "Failed", label: "Failed" },
          ],
        },
        {
          key: "level",
          label: "All levels",
          value: level,
          onChange: setLevel,
          options: ACADEMIC_CATEGORIES.filter((c) => withResult.some((row) => row.department === c.value)).map((c) => ({ value: c.value, label: c.label })),
        },
        { key: "appliedFor", label: "All applied for", value: appliedFor, onChange: setAppliedFor, options: distinct(withResult, (row) => row.courseAppliedFor) },
      ]}
    />
  );
}
