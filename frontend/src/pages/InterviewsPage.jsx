import { useCallback, useEffect, useState } from "react";
import { evaluateInterview, listInterviewQueue, scheduleInterview } from "../api/admissionStepsApi.js";
import { ApiError } from "../api/apiClient.js";
import { useToast } from "../context/ToastContext.jsx";
import { formatCalendarDate, formatDateTime } from "../utils/format.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import DataTable, { PersonCell, RowAction } from "../components/ui/DataTable.jsx";
import Modal, { DetailList } from "../components/ui/Modal.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import "./StaffPaymentsPage.css";

const STAGE_LABEL = { NeedsSchedule: "Needs schedule", Scheduled: "Scheduled", Passed: "Passed", Failed: "Failed" };
const STAGE_TONE = { NeedsSchedule: "Pending", Scheduled: "UnderReview", Passed: "Approved", Failed: "Rejected" };

function formatTime(isoTime) {
  if (!isoTime) return "";
  const [hours, minutes] = isoTime.split(":").map(Number);
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function todayLocal() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function ScheduleModal({ row, onClose, onSaved }) {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    interviewDate: row.interviewDate ?? "",
    interviewTime: row.interviewTime?.slice(0, 5) ?? "09:00",
    location: row.location ?? "BCAS Admissions Office",
    instructions: row.instructions ?? "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const change = (event) => setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));

  async function handleSave() {
    if (!form.interviewDate || !form.interviewTime || !form.location.trim()) {
      setErrorMessage("Enter the interview date, time and location.");
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await scheduleInterview(row.applicationId, { ...form, interviewTime: `${form.interviewTime}:00`, location: form.location.trim(), instructions: form.instructions.trim() });
      showToast("Interview scheduled. The applicant has been notified.");
      await onSaved("Scheduled");
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
      title={row.interviewDate ? "Reschedule interview" : "Schedule interview"}
      subtitle={`${row.applicantName} · ${row.courseAppliedFor}`}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save and notify"}
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
          <label htmlFor="interviewDate">Date</label>
          <input id="interviewDate" name="interviewDate" type="date" min={todayLocal()} value={form.interviewDate} onChange={change} />
        </div>
        <div className="form-row">
          <label htmlFor="interviewTime">Time</label>
          <input id="interviewTime" name="interviewTime" type="time" value={form.interviewTime} onChange={change} />
        </div>
      </div>
      <div className="form-row">
        <label htmlFor="location">Location</label>
        <input id="location" name="location" type="text" maxLength={200} value={form.location} onChange={change} />
      </div>
      <div className="form-row">
        <label htmlFor="instructions">Instructions (optional)</label>
        <textarea id="instructions" name="instructions" rows={3} maxLength={500} value={form.instructions} onChange={change} />
        <p className="form-note">The reminder to bring the original copies of submitted documents is always added.</p>
      </div>
    </Modal>
  );
}

function EvaluateModal({ row, onClose, onSaved }) {
  const { showToast } = useToast();
  const [evaluation, setEvaluation] = useState("Passed");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  async function handleSave() {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await evaluateInterview(row.applicationId, { evaluation, notes: notes.trim() });
      showToast(evaluation === "Passed" ? "Admission result recorded. The applicant can proceed to enrollment." : "Admission result recorded.");
      await onSaved(evaluation);
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
      title="Interview result"
      subtitle={`${row.applicantName} · interviewed ${formatCalendarDate(row.interviewDate)}`}
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
          Admission result
        </legend>
        <div className="choice-grid choice-grid-3">
          {["Passed", "Failed"].map((value) => (
            <label key={value} className={`choice-tile${evaluation === value ? " choice-tile-checked" : ""}`}>
              <input type="radio" name="evaluation" value={value} checked={evaluation === value} onChange={() => setEvaluation(value)} />
              <span className="choice-tile-title">{value}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="form-note">
        {evaluation === "Passed"
          ? "The application is approved and the applicant is told to proceed to enrollment."
          : "The application is closed and the applicant is notified."}
      </p>
      <div className="form-row">
        <label htmlFor="notes">Evaluation notes (optional)</label>
        <textarea id="notes" rows={3} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </Modal>
  );
}

function DetailModal({ row, onClose }) {
  return (
    <Modal open onClose={onClose} title="Admission result" subtitle={`${row.applicantName} · ${row.applicantEmail}`} footer={<button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>}>
      <DetailList
        items={[
          { label: "Result", value: row.stage },
          { label: "Interview", value: `${formatCalendarDate(row.interviewDate)} at ${formatTime(row.interviewTime)}` },
          { label: "Location", value: row.location },
          { label: "Evaluated", value: row.evaluatedAt ? formatDateTime(row.evaluatedAt) : null },
          { label: "Notes", value: row.evaluationNotes, wide: true },
        ]}
      />
    </Modal>
  );
}

export default function InterviewsPage() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("NeedsSchedule");
  const [appliedFilter, setAppliedFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [active, setActive] = useState(null);

  // The applicant just moved to another stage, so show that stage rather than an emptied one.
  const loadAndShow = async (stage) => {
    await load();
    if (stage) setFilter(stage);
  };

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setRows(await listInterviewQueue());
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to load interviews.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const shown = rows.filter((row) => (!filter || row.stage === filter) && (!appliedFilter || row.courseAppliedFor === appliedFilter));
  const appliedOptions = [...new Set(rows.map((row) => row.courseAppliedFor).filter(Boolean))].sort().map((value) => ({ value, label: value }));
  const count = (stage) => rows.filter((row) => row.stage === stage).length;

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
      key: "interview",
      header: "Interview",
      accessor: (row) => row.interviewDate ?? "",
      sortable: true,
      render: (row) =>
        row.interviewDate ? <PersonCell name={formatCalendarDate(row.interviewDate)} detail={`${formatTime(row.interviewTime)} · ${row.location}`} /> : <span className="ui-cell-muted">Not scheduled</span>,
    },
    {
      key: "stage",
      header: "Status",
      accessor: (row) => row.stage,
      sortable: true,
      render: (row) => <StatusBadge status={STAGE_TONE[row.stage]} label={STAGE_LABEL[row.stage]} />,
    },
    {
      key: "action",
      header: "Action",
      align: "right",
      searchable: false,
      render: (row) =>
        row.stage === "NeedsSchedule" ? (
          <RowAction label="Schedule" icon="calendar" onClick={() => setActive({ mode: "schedule", row })} ariaLabel={`Schedule ${row.applicantName}'s interview`} />
        ) : row.stage === "Scheduled" ? (
          <span className="row-actions">
            <RowAction label="Reschedule" icon="calendar" onClick={() => setActive({ mode: "schedule", row })} ariaLabel={`Reschedule ${row.applicantName}'s interview`} />
            <RowAction label="Record result" icon="pencil" onClick={() => setActive({ mode: "evaluate", row })} ariaLabel={`Record ${row.applicantName}'s interview result`} />
          </span>
        ) : (
          <RowAction label="View" icon="eye" onClick={() => setActive({ mode: "view", row })} ariaLabel={`View ${row.applicantName}'s admission result`} />
        ),
    },
  ];

  return (
    <AppLayout>
      <DataTable
        title="Interviews & Admission Results"
        subtitle="Applicants who passed the entrance exam. Schedule their interview, then record the result: a pass tells them to proceed to enrollment."
        columns={columns}
        rows={shown}
        getRowKey={(row) => row.applicationId}
        isLoading={isLoading}
        errorMessage={errorMessage}
        emptyMessage="No applicants in this stage."
        searchPlaceholder="Search by applicant or course"
        filters={[
          {
            key: "result",
            label: "All results",
            value: filter,
            onChange: setFilter,
            options: [
              { value: "NeedsSchedule", label: STAGE_LABEL.NeedsSchedule },
              { value: "Scheduled", label: STAGE_LABEL.Scheduled },
              { value: "Passed", label: STAGE_LABEL.Passed },
              { value: "Failed", label: STAGE_LABEL.Failed },
            ],
          },
          { key: "appliedFor", label: "All applied for", value: appliedFilter, onChange: setAppliedFilter, options: appliedOptions },
        ]}
        summary={[
          { label: "Needs schedule", value: count("NeedsSchedule"), tone: "amber", onClick: () => setFilter("NeedsSchedule"), active: filter === "NeedsSchedule" },
          { label: "Scheduled", value: count("Scheduled"), tone: "amber", onClick: () => setFilter("Scheduled"), active: filter === "Scheduled" },
          { label: "Passed", value: count("Passed"), tone: "green", onClick: () => setFilter("Passed"), active: filter === "Passed" },
          { label: "Failed", value: count("Failed"), tone: "red", onClick: () => setFilter("Failed"), active: filter === "Failed" },
        ]}
        summaryNote="Select a count to filter the list."
      />

      {active?.mode === "schedule" && <ScheduleModal row={active.row} onClose={() => setActive(null)} onSaved={loadAndShow} />}
      {active?.mode === "evaluate" && <EvaluateModal row={active.row} onClose={() => setActive(null)} onSaved={loadAndShow} />}
      {active?.mode === "view" && <DetailModal row={active.row} onClose={() => setActive(null)} />}
    </AppLayout>
  );
}
