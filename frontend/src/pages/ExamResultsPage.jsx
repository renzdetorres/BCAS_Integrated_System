import { useCallback, useEffect, useState } from "react";
import { EXAM_RESULTS, listExamResultQueue, recordExamResult } from "../api/admissionStepsApi.js";
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
  Failed: "The application is closed.",
  Retake: "The applicant goes back to choose a new exam schedule and their current booking is removed.",
};

function stateOf(row) {
  return row.applicationStatus === "ExamDone" ? "Awaiting" : row.result;
}

function RecordModal({ row, onClose, onSaved }) {
  const { showToast } = useToast();
  const [result, setResult] = useState("Passed");
  const [score, setScore] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  async function handleSave() {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await recordExamResult(row.applicationId, { result, score, remarks: remarks.trim() });
      showToast(`Result recorded: ${result}.`);
      await onSaved(result);
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
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Record result"}
          </button>
        </>
      }
    >
      {errorMessage && (
        <p className="form-error" role="alert">
          {errorMessage}
        </p>
      )}
      <fieldset className="choice-group">
        <legend className="form-section-title" style={{ marginTop: 0 }}>
          Result
        </legend>
        <div className="choice-grid choice-grid-3">
          {EXAM_RESULTS.map((value) => (
            <label key={value} className={`choice-tile${result === value ? " choice-tile-checked" : ""}`}>
              <input type="radio" name="result" value={value} checked={result === value} onChange={() => setResult(value)} />
              <span className="choice-tile-title">{value}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="form-note">{CONSEQUENCE[result]}</p>

      <div className="form-grid">
        <div className="form-row">
          <label htmlFor="score">Score (optional)</label>
          <input id="score" type="number" min="0" max="100" step="0.01" value={score} onChange={(e) => setScore(e.target.value)} />
        </div>
      </div>
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
          { label: "Score", value: row.score },
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
  const canRecord = session.role === "Admin" || session.role === "Evaluator";
  const [rows, setRows] = useState([]);
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
      setRows(await listExamResultQueue());
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

  const shown = rows.filter((row) => !filter || stateOf(row) === filter);
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
      align: "right",
      searchable: false,
      render: (row) =>
        stateOf(row) === "Awaiting" ? (
          canRecord ? (
            <RowAction label="Record result" icon="pencil" onClick={() => setActive({ mode: "record", row })} ariaLabel={`Record ${row.applicantName}'s result`} />
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
            ? "Applicants who took the entrance exam. Record Passed, Failed or Retake; a pass moves them to the interview, a retake sends them back to choose a new schedule."
            : "Monitor entrance exam results. Evaluators and admins record them."
        }
        columns={columns}
        rows={shown}
        getRowKey={(row) => row.applicationId}
        isLoading={isLoading}
        errorMessage={errorMessage}
        emptyMessage={filter === "Awaiting" ? "No applicants are waiting for a result." : "No applicants match this filter."}
        searchPlaceholder="Search by applicant or course"
        summary={[
          { label: "Awaiting result", value: count("Awaiting"), tone: "amber", onClick: () => setFilter("Awaiting"), active: filter === "Awaiting" },
          { label: "Passed", value: count("Passed"), tone: "green", onClick: () => setFilter("Passed"), active: filter === "Passed" },
          { label: "Failed", value: count("Failed"), tone: "red", onClick: () => setFilter("Failed"), active: filter === "Failed" },
          { label: "Retake", value: count("Retake"), tone: "amber", onClick: () => setFilter("Retake"), active: filter === "Retake" },
        ]}
        summaryNote="Select a count to filter the list."
      />

      {active?.mode === "record" && <RecordModal row={active.row} onClose={() => setActive(null)} onSaved={loadAndShow} />}
      {active?.mode === "view" && <DetailModal row={active.row} onClose={() => setActive(null)} />}
    </AppLayout>
  );
}
