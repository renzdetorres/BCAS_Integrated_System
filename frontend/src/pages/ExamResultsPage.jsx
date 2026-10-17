import { useCallback, useEffect, useState } from "react";
import { getExamScoringRules, listExamResultQueue, recordExamResult } from "../api/admissionStepsApi.js";
import { ApiError } from "../api/apiClient.js";
import { useSession } from "../context/SessionContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { formatCalendarDate, formatDateTime } from "../utils/format.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import DataTable, { PersonCell, RowAction } from "../components/ui/DataTable.jsx";
import Modal, { DetailList } from "../components/ui/Modal.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import "./StaffPaymentsPage.css";

const RESULT_TONE = { Passed: "Approved", Failed: "Rejected", Retake: "Pending" };

const CONSEQUENCE = {
  Passed: "The applicant moves on to the interview.",
  Failed: "The applicant has used every retake, so the application is closed.",
  Retake: "The applicant goes back to choose a new exam schedule and their current booking is removed.",
};

function stateOf(row) {
  return row.applicationStatus === "ExamDone" ? "Awaiting" : row.result;
}

/** The same rule the server applies (ExamScoring.Decide), shown before the score is saved. */
function decide(score, attemptNumber, rules) {
  if (score >= rules.passingScore) return "Passed";
  return attemptNumber - 1 < rules.maxRetakes ? "Retake" : "Failed";
}

function RecordModal({ row, rules, onClose, onSaved }) {
  const { showToast } = useToast();
  const [score, setScore] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const attemptNumber = row.attempts + 1;
  const entered = score === "" ? null : Number(score);
  const valid = entered !== null && Number.isFinite(entered) && entered >= 0 && entered <= rules.totalItems;
  const outcome = valid ? decide(entered, attemptNumber, rules) : null;

  async function handleSave() {
    if (!valid) {
      setErrorMessage(`Enter a raw score from 0 to ${rules.totalItems}.`);
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const saved = await recordExamResult(row.applicationId, { score, remarks: remarks.trim() });
      showToast(`Score recorded. Result: ${saved.result}.`);
      await onSaved(saved.result);
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      busy={isSaving}
      title="Record exam result"
      subtitle={`${row.applicantName} · ${row.courseAppliedFor}`}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={isSaving || !valid}>
            {isSaving ? "Saving..." : "Save score"}
          </button>
        </>
      }
    >
      {errorMessage && (
        <p className="form-error" role="alert">
          {errorMessage}
        </p>
      )}
      <div className="form-grid">
        <div className="form-row">
          <label htmlFor="score">Raw score (out of {rules.totalItems})</label>
          <input
            id="score"
            type="number"
            min="0"
            max={rules.totalItems}
            step="0.01"
            inputMode="decimal"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            data-autofocus
          />
        </div>
      </div>
      <p className="form-note" role="status">
        {outcome
          ? `${outcome}${outcome === "Retake" ? ` (retake ${attemptNumber} of ${rules.maxRetakes})` : ""}. ${CONSEQUENCE[outcome]}`
          : `Passing score is ${rules.passingScore}. Below it the applicant retakes, up to ${rules.maxRetakes} time${rules.maxRetakes === 1 ? "" : "s"}, then fails.`}
      </p>
      <div className="form-row">
        <label htmlFor="remarks">Remarks (optional, the applicant can see these)</label>
        <textarea id="remarks" rows={3} maxLength={500} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
      </div>
    </Modal>
  );
}

function DetailModal({ row, onClose }) {
  return (
    <Modal open onClose={onClose} title="Exam result" subtitle={`${row.applicantName} · ${row.applicantEmail}`} footer={<button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>}>
      <DetailList
        items={[
          { label: "Result", value: row.result },
          { label: "Raw score", value: row.score },
          { label: "Attempts", value: row.attempts },
          { label: "Exam date", value: row.examDate ? formatCalendarDate(row.examDate) : null },
          { label: "Recorded", value: row.recordedAt ? formatDateTime(row.recordedAt) : null },
          { label: "Remarks", value: row.remarks, wide: true },
        ]}
      />
    </Modal>
  );
}

export default function ExamResultsPage() {
  const { session } = useSession();
  const canRecord = ["Admin", "Evaluator", "SupportStaff"].includes(session.role);
  const [rows, setRows] = useState([]);
  const [rules, setRules] = useState(null);
  const [appliedFilter, setAppliedFilter] = useState("");
  const [filter, setFilter] = useState("Awaiting");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [active, setActive] = useState(null);

  // The applicant just left "Awaiting result", so show the list they moved to.
  const loadAndShow = async (result) => {
    await load();
    if (result) setFilter(result);
  };

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [queue, scoring] = await Promise.all([listExamResultQueue(), getExamScoringRules()]);
      setRows(queue);
      setRules(scoring);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to load exam results.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const shown = rows.filter((row) => (!filter || stateOf(row) === filter) && (!appliedFilter || row.courseAppliedFor === appliedFilter));
  const appliedOptions = [...new Set(rows.map((row) => row.courseAppliedFor).filter(Boolean))].sort().map((value) => ({ value, label: value }));
  const count = (state) => rows.filter((row) => stateOf(row) === state).length;

  const columns = [
    {
      key: "applicant",
      header: "Applicant",
      accessor: (row) => row.applicantName,
      sortable: true,
      render: (row) => <PersonCell name={row.applicantName} detail={row.applicantEmail} />,
    },
    {
      key: "level",
      header: "Applied for",
      accessor: (row) => `${row.department ?? ""} ${row.courseAppliedFor}`,
      render: (row) => <PersonCell name={row.courseAppliedFor} detail={[row.department, row.yearLevel].filter(Boolean).join(" · ")} />,
    },
    {
      key: "examDate",
      header: "Exam date",
      accessor: (row) => row.examDate ?? "",
      sortable: true,
      render: (row) => (row.examDate ? formatCalendarDate(row.examDate) : <span className="ui-cell-muted">-</span>),
    },
    {
      key: "score",
      header: "Raw score",
      accessor: (row) => row.score ?? -1,
      sortable: true,
      searchable: false,
      render: (row) =>
        row.score == null ? <span className="ui-cell-muted">-</span> : rules ? `${row.score} / ${rules.totalItems}` : row.score,
    },
    {
      key: "state",
      header: "Result",
      accessor: (row) => stateOf(row),
      sortable: true,
      render: (row) =>
        stateOf(row) === "Awaiting" ? (
          <StatusBadge status="Pending" label="Awaiting result" />
        ) : (
          <StatusBadge status={RESULT_TONE[row.result]} label={row.result} />
        ),
    },
    { key: "attempts", header: "Attempts", accessor: (row) => row.attempts, sortable: true },
    {
      key: "action",
      header: "Action",
      searchable: false,
      render: (row) =>
        stateOf(row) === "Awaiting" ? (
          canRecord && rules ? (
            <RowAction label="Enter score" icon="pencil" onClick={() => setActive({ mode: "record", row })} ariaLabel={`Enter ${row.applicantName}'s raw score`} />
          ) : null
        ) : (
          <RowAction label="View" icon="eye" onClick={() => setActive({ mode: "view", row })} ariaLabel={`View ${row.applicantName}'s result`} />
        ),
    },
  ];

  return (
    <AppLayout>
      <DataTable
        title="Exam Results"
        subtitle={
          canRecord
            ? "Applicants who took the entrance exam. Enter each raw score and the result follows: a pass moves them to the interview, a retake sends them back to choose a new schedule."
            : "Monitor entrance exam results."
        }
        columns={columns}
        rows={shown}
        getRowKey={(row) => row.applicationId}
        isLoading={isLoading}
        errorMessage={errorMessage}
        emptyMessage={filter === "Awaiting" ? "No applicants are waiting for a result." : "No applicants match this filter."}
        searchPlaceholder="Search by applicant or course"
        filters={[
          {
            key: "result",
            label: "All results",
            value: filter,
            onChange: setFilter,
            options: [
              { value: "Awaiting", label: "Awaiting result" },
              { value: "Passed", label: "Passed" },
              { value: "Retake", label: "Retake" },
              { value: "Failed", label: "Failed" },
            ],
          },
          { key: "appliedFor", label: "All applied for", value: appliedFilter, onChange: setAppliedFilter, options: appliedOptions },
        ]}
        summary={[
          { label: "Awaiting result", value: count("Awaiting"), tone: "amber", onClick: () => setFilter("Awaiting"), active: filter === "Awaiting" },
          { label: "Passed", value: count("Passed"), tone: "green", onClick: () => setFilter("Passed"), active: filter === "Passed" },
          { label: "Failed", value: count("Failed"), tone: "red", onClick: () => setFilter("Failed"), active: filter === "Failed" },
          { label: "Retake", value: count("Retake"), tone: "amber", onClick: () => setFilter("Retake"), active: filter === "Retake" },
        ]}
        summaryNote="Select a count to filter the list."
      />

      {active?.mode === "record" && rules && <RecordModal row={active.row} rules={rules} onClose={() => setActive(null)} onSaved={loadAndShow} />}
      {active?.mode === "view" && <DetailModal row={active.row} onClose={() => setActive(null)} />}
    </AppLayout>
  );
}
