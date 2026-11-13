import { useCallback, useEffect, useState } from "react";
import { getExamScoringRules, listExamResultQueue, recordExamResult, releaseExamResult } from "../api/admissionStepsApi.js";
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

// What happens once Support Staff release the result.
const CONSEQUENCE = {
  Passed: "Once released, the applicant moves on to the interview.",
  Failed: "Once released, the application is closed: the applicant has used every retake.",
  Retake: "Once released, the applicant goes back to choose a new exam schedule and their current booking is removed.",
};

/**
 * Awaiting: took the exam, no score yet (the Evaluator records it).
 * Recorded: a score is in and waiting for Support Staff to release it; the applicant has not been told.
 * Otherwise the released result: Passed, Failed or Retake.
 */
function stateOf(row) {
  if (row.result && !row.releasedAt && row.applicationStatus === "ExamDone") return "Recorded";
  if (row.applicationStatus === "ExamDone" && !row.result) return "Awaiting";
  return row.result;
}

/** The same rule the server applies (ExamScoring.Decide), shown before the score is saved. */
function decide(score, attemptNumber, rules) {
  if (score >= rules.passingScore) return "Passed";
  return attemptNumber - 1 < rules.maxRetakes ? "Retake" : "Failed";
}

function RecordModal({ row, rules, onClose, onSaved }) {
  const { showToast } = useToast();
  // Correcting a score that was recorded but not released yet starts from what is there.
  const [score, setScore] = useState(row.score == null ? "" : String(row.score));
  const [remarks, setRemarks] = useState(row.remarks ?? "");
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
      showToast(`Score recorded (${saved.result}). Support Staff can now release it to the applicant.`);
      await onSaved("Recorded");
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
      title={row.result ? "Correct recorded score" : "Record exam result"}
      subtitle={`${row.applicantName} · ${row.courseAppliedFor}`}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={isSaving || !valid}>
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

function ReleaseModal({ row, rules, onClose, onReleased }) {
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  async function handleRelease() {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const released = await releaseExamResult(row.applicationId);
      showToast(`Result released to ${row.applicantName}: ${released.result}.`);
      await onReleased(released.result);
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
      title="Release exam result"
      subtitle={`${row.applicantName} · ${row.courseAppliedFor}`}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleRelease} disabled={isSaving}>
            {isSaving ? "Releasing..." : "Release to applicant"}
          </button>
        </>
      }
    >
      {errorMessage && (
        <p className="form-error" role="alert">
          {errorMessage}
        </p>
      )}
      <DetailList
        items={[
          { label: "Raw score", value: rules ? `${row.score} / ${rules.totalItems}` : row.score },
          { label: "Result", value: row.result },
          { label: "Recorded", value: row.recordedAt ? formatDateTime(row.recordedAt) : null },
          { label: "Remarks", value: row.remarks, wide: true },
        ]}
      />
      <p className="form-note" role="status">
        {CONSEQUENCE[row.result]} The applicant is notified by email and can then see the result.
      </p>
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
          { label: "Released to applicant", value: row.releasedAt ? formatDateTime(row.releasedAt) : "Not yet released" },
          { label: "Remarks", value: row.remarks, wide: true },
        ]}
      />
    </Modal>
  );
}

export default function ExamResultsPage() {
  const { session } = useSession();
  // The Evaluator records the score; Support Staff release it to the applicant. The Admin can do both.
  const canRecord = ["Admin", "Evaluator"].includes(session.role);
  const canRelease = ["Admin", "SupportStaff"].includes(session.role);
  const [rows, setRows] = useState([]);
  const [rules, setRules] = useState(null);
  const [appliedFilter, setAppliedFilter] = useState("");
  const [filter, setFilter] = useState(session.role === "SupportStaff" ? "Recorded" : "Awaiting");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [active, setActive] = useState(null);

  // The applicant just moved to another list (recorded, or released as Passed/Failed/Retake), so show it.
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
      render: (row) => {
        const state = stateOf(row);
        if (state === "Awaiting") return <StatusBadge status="Pending" label="Awaiting score" />;
        if (state === "Recorded") return <StatusBadge status={RESULT_TONE[row.result]} label={`${row.result} · not released`} />;
        return <StatusBadge status={RESULT_TONE[row.result]} label={row.result} />;
      },
    },
    { key: "attempts", header: "Attempts", accessor: (row) => row.attempts, sortable: true },
    {
      key: "action",
      header: "Action",
      searchable: false,
      render: (row) => {
        const state = stateOf(row);
        if (state === "Awaiting") {
          return canRecord && rules ? (
            <RowAction label="Record result" icon="pencil" onClick={() => setActive({ mode: "record", row })} ariaLabel={`Record ${row.applicantName}'s exam score`} />
          ) : (
            <span className="ui-cell-muted">Waiting for the Evaluator</span>
          );
        }
        if (state === "Recorded") {
          return (
            <span className="ui-datatable-actions">
              {canRelease && rules ? (
                <RowAction label="Release result" icon="send" onClick={() => setActive({ mode: "release", row })} ariaLabel={`Release ${row.applicantName}'s exam result`} />
              ) : null}
              {canRecord && rules ? (
                <RowAction label="Edit score" icon="pencil" onClick={() => setActive({ mode: "record", row })} ariaLabel={`Correct ${row.applicantName}'s recorded score`} />
              ) : null}
              {!canRelease && !canRecord ? <span className="ui-cell-muted">Waiting for release</span> : null}
            </span>
          );
        }
        return <RowAction label="View" icon="eye" onClick={() => setActive({ mode: "view", row })} ariaLabel={`View ${row.applicantName}'s result`} />;
      },
    },
  ];

  return (
    <AppLayout>
      <DataTable
        title="Exam Results"
        subtitle={
          session.role === "SupportStaff"
            ? "Scores the Evaluator has recorded. Release a result to tell the applicant: a pass moves them to the interview, a retake sends them back to choose a new schedule."
            : session.role === "Evaluator"
              ? "Applicants who took the entrance exam. Record each raw score and the result follows. Support Staff then release it to the applicant."
              : "Record each raw score, then release the result to the applicant: a pass moves them to the interview, a retake sends them back to choose a new schedule."
        }
        columns={columns}
        rows={shown}
        getRowKey={(row) => row.applicationId}
        isLoading={isLoading}
        errorMessage={errorMessage}
        emptyMessage={
          filter === "Awaiting"
            ? "No applicants are waiting for a score."
            : filter === "Recorded"
              ? "No recorded scores are waiting to be released."
              : "No applicants match this filter."
        }
        searchPlaceholder="Search by applicant or course"
        filters={[
          {
            key: "result",
            label: "All results",
            value: filter,
            onChange: setFilter,
            options: [
              { value: "Awaiting", label: "Awaiting score" },
              { value: "Recorded", label: "Ready to release" },
              { value: "Passed", label: "Passed" },
              { value: "Retake", label: "Retake" },
              { value: "Failed", label: "Failed" },
            ],
          },
          { key: "appliedFor", label: "All applied for", value: appliedFilter, onChange: setAppliedFilter, options: appliedOptions },
        ]}
        summary={[
          { label: "Awaiting score", value: count("Awaiting"), tone: "amber", onClick: () => setFilter("Awaiting"), active: filter === "Awaiting" },
          { label: "Ready to release", value: count("Recorded"), tone: "amber", onClick: () => setFilter("Recorded"), active: filter === "Recorded" },
          { label: "Passed", value: count("Passed"), tone: "green", onClick: () => setFilter("Passed"), active: filter === "Passed" },
          { label: "Failed", value: count("Failed"), tone: "red", onClick: () => setFilter("Failed"), active: filter === "Failed" },
          { label: "Retake", value: count("Retake"), tone: "amber", onClick: () => setFilter("Retake"), active: filter === "Retake" },
        ]}
        summaryNote="Select a count to filter the list."
      />

      {active?.mode === "record" && rules && <RecordModal row={active.row} rules={rules} onClose={() => setActive(null)} onSaved={loadAndShow} />}
      {active?.mode === "release" && rules && <ReleaseModal row={active.row} rules={rules} onClose={() => setActive(null)} onReleased={loadAndShow} />}
      {active?.mode === "view" && <DetailModal row={active.row} onClose={() => setActive(null)} />}
    </AppLayout>
  );
}
