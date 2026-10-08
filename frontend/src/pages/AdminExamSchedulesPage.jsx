import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DAY_TYPES,
  EXAM_STATUSES,
  createExamSchedule,
  listExamSchedules,
  setApplicantExamStatus,
  setExamScheduleOffered,
} from "../api/adminExamSchedulesApi.js";
import { ApiError } from "../api/apiClient.js";
import { useToast } from "../context/ToastContext.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";
import DataTable, { PersonCell, RowAction } from "../components/ui/DataTable.jsx";
import Icon from "../components/ui/Icon.jsx";
import Modal from "../components/ui/Modal.jsx";
import { formatCalendarDate as formatDate, formatDateTime, formatTime } from "../utils/format.js";
import "./AdminExamSchedulesPage.css";

const initialForm = { dayType: DAY_TYPES[0], examDate: "", examTime: "", venue: "", isOffered: true };

function scheduleLabel(schedule) {
  return `${formatDate(schedule.examDate)} at ${formatTime(schedule.examTime)}`;
}

function AddScheduleModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(initialForm);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (open) {
      setForm(initialForm);
      setErrorMessage(null);
    }
  }, [open]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    if (!form.examDate || !form.examTime || !form.venue.trim()) {
      setErrorMessage("Fill in the date, time and venue.");
      return;
    }
    setIsCreating(true);
    try {
      await createExamSchedule(form);
      onCreated(form);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to create the exam schedule.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={isCreating}
      title="Add exam schedule"
      subtitle="Saturday slots are always selectable. Weekday slots also need a teacher available to assist."
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isCreating}>
            Cancel
          </button>
          <button type="submit" form="add-schedule-form" className="btn btn-primary" disabled={isCreating}>
            {isCreating ? "Adding..." : "Add schedule"}
          </button>
        </>
      }
    >
      <form id="add-schedule-form" onSubmit={handleSubmit} noValidate>
        {errorMessage ? (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className="ui-field">
          <label className="ui-label" htmlFor="dayType">
            Day type
          </label>
          <select id="dayType" name="dayType" className="ui-select" value={form.dayType} onChange={handleChange} data-autofocus>
            {DAY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div className="ui-field-row">
          <div className="ui-field">
            <label className="ui-label" htmlFor="examDate">
              Exam date
            </label>
            <input id="examDate" name="examDate" type="date" className="ui-input" required value={form.examDate} onChange={handleChange} />
          </div>
          <div className="ui-field">
            <label className="ui-label" htmlFor="examTime">
              Exam time
            </label>
            <input id="examTime" name="examTime" type="time" className="ui-input" required value={form.examTime} onChange={handleChange} />
          </div>
        </div>
        <div className="ui-field">
          <label className="ui-label" htmlFor="venue">
            Venue
          </label>
          <input
            id="venue"
            name="venue"
            type="text"
            className="ui-input"
            required
            placeholder="e.g. Main Building, Room 204"
            value={form.venue}
            onChange={handleChange}
          />
        </div>
        {form.dayType === "Weekday" ? (
          <label className="exam-offer-check">
            <input type="checkbox" name="isOffered" checked={form.isOffered} onChange={handleChange} />
            <span>
              Offer this slot now
              <small>Only when a teacher is available to assist.</small>
            </span>
          </label>
        ) : null}
      </form>
    </Modal>
  );
}

function ApplicantsModal({ schedule, onClose, onChangeStatus, pendingUserId }) {
  const applicants = schedule.assignedApplicants;
  return (
    <Modal
      open
      onClose={onClose}
      title={`Applicants for ${scheduleLabel(schedule)}`}
      subtitle={`${schedule.venue} · ${applicants.length} applicant${applicants.length === 1 ? "" : "s"}`}
      footer={
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      }
    >
      {applicants.length === 0 ? (
        <p className="exam-empty">No applicant has picked this slot yet.</p>
      ) : (
        <ol className="exam-applicant-list">
          {applicants.map((applicant) => (
            <li key={applicant.applicantEmail}>
              <PersonCell name={applicant.applicantName} detail={applicant.applicantEmail} />
              <div className="exam-applicant-side">
              <span className="exam-applicant-date">Picked {formatDateTime(applicant.selectedAt)}</span>
              <select
                className="ui-select exam-applicant-status"
                aria-label={`Exam status for ${applicant.applicantName}`}
                value={applicant.examStatus}
                disabled={pendingUserId === applicant.userId}
                onChange={(event) => onChangeStatus(applicant, event.target.value)}
              >
                {EXAM_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
}

export default function AdminExamSchedulesPage() {
  const { showToast } = useToast();
  const [schedules, setSchedules] = useState([]);
  const [pendingStatusUserId, setPendingStatusUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [pendingToggleId, setPendingToggleId] = useState(null);
  const [unofferTarget, setUnofferTarget] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [dayFilter, setDayFilter] = useState("");
  const [offerFilter, setOfferFilter] = useState("");

  async function handleExamStatus(applicant, status) {
    setPendingStatusUserId(applicant.userId);
    try {
      await setApplicantExamStatus(applicant.userId, status);
      await loadSchedules();
      showToast(`${applicant.applicantName} marked ${EXAM_STATUSES.find((s) => s.value === status)?.label ?? status}.`);
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "Failed to update the exam status.", "error");
    } finally {
      setPendingStatusUserId(null);
    }
  }

  const loadSchedules = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listExamSchedules();
      setSchedules(data);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : "Failed to load exam schedules.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  async function applyToggleOffered(schedule) {
    setPendingToggleId(schedule.examScheduleId);
    try {
      const updated = await setExamScheduleOffered(schedule.examScheduleId, !schedule.isOffered);
      setSchedules((prev) =>
        prev.map((s) => (s.examScheduleId === updated.examScheduleId ? { ...s, isOffered: updated.isOffered } : s)),
      );
      showToast(`${scheduleLabel(schedule)} is now ${updated.isOffered ? "offered" : "not offered"}.`);
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "Failed to update the exam schedule.", "error");
    } finally {
      setPendingToggleId(null);
    }
  }

  function handleToggleOffered(schedule) {
    if (schedule.isOffered) {
      setUnofferTarget(schedule);
    } else {
      applyToggleOffered(schedule);
    }
  }

  async function confirmUnoffer() {
    const schedule = unofferTarget;
    setUnofferTarget(null);
    await applyToggleOffered(schedule);
  }

  const rows = useMemo(
    () =>
      schedules.filter(
        (s) =>
          (!dayFilter || s.dayType === dayFilter) &&
          (!offerFilter || (offerFilter === "offered" ? s.isOffered : !s.isOffered)),
      ),
    [schedules, dayFilter, offerFilter],
  );

  const columns = [
    {
      key: "when",
      header: "Date & time",
      accessor: (row) => `${row.examDate}T${row.examTime}`,
      sortable: true,
      render: (row) => <PersonCell name={formatDate(row.examDate)} detail={formatTime(row.examTime)} />,
    },
    {
      key: "dayType",
      header: "Day",
      sortable: true,
      render: (row) => <span className={`exam-daytype exam-daytype-${row.dayType.toLowerCase()}`}>{row.dayType}</span>,
    },
    { key: "venue", header: "Venue", sortable: true },
    {
      key: "applicants",
      header: "Applicants",
      align: "right",
      accessor: (row) => row.assignedApplicants.length,
      sortable: true,
      searchable: false,
    },
    {
      key: "offered",
      header: "Availability",
      accessor: (row) => (row.isOffered ? "Offered" : "Not offered"),
      sortable: true,
      render: (row) =>
        row.dayType === "Weekday" ? (
          <button
            type="button"
            role="switch"
            aria-checked={row.isOffered}
            className="exam-switch"
            onClick={(event) => {
              event.stopPropagation();
              handleToggleOffered(row);
            }}
            disabled={pendingToggleId === row.examScheduleId}
          >
            <span className="exam-switch-track" aria-hidden="true">
              <span className="exam-switch-thumb" />
            </span>
            {row.isOffered ? "Offered" : "Not offered"}
          </button>
        ) : (
          <span className="exam-always">Always offered</span>
        ),
    },
    {
      key: "action",
      header: "Action",
      align: "right",
      searchable: false,
      render: (row) => (
        <RowAction
          label="View applicants"
          icon="users"
          onClick={() => setViewing(row)}
          ariaLabel={`View applicants for ${scheduleLabel(row)}`}
        />
      ),
    },
  ];

  return (
    <AppLayout>
      <DataTable
        title="Exam Schedules"
        subtitle="Every entrance exam slot applicants can pick from, and who has picked each one."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setIsAdding(true)}>
            <Icon name="plus" size={16} />
            Add schedule
          </button>
        }
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.examScheduleId}
        isLoading={isLoading}
        errorMessage={loadError}
        emptyMessage={schedules.length === 0 ? "No exam schedules yet. Add the first one." : "No schedules match these filters."}
        searchPlaceholder="Search by venue"
        filters={[
          {
            key: "dayType",
            label: "All days",
            value: dayFilter,
            onChange: setDayFilter,
            options: DAY_TYPES.map((type) => ({ value: type, label: type })),
          },
          {
            key: "offered",
            label: "Any availability",
            value: offerFilter,
            onChange: setOfferFilter,
            options: [
              { value: "offered", label: "Offered" },
              { value: "not-offered", label: "Not offered" },
            ],
          },
        ]}
      />

      <AddScheduleModal
        open={isAdding}
        onClose={() => setIsAdding(false)}
        onCreated={async (form) => {
          setIsAdding(false);
          showToast(`Exam schedule added for ${formatDate(form.examDate)}.`);
          await loadSchedules();
        }}
      />

      {viewing ? (
        <ApplicantsModal
          schedule={schedules.find((s) => s.examScheduleId === viewing.examScheduleId) ?? viewing}
          onClose={() => setViewing(null)}
          onChangeStatus={handleExamStatus}
          pendingUserId={pendingStatusUserId}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(unofferTarget)}
        title="Mark this schedule as not offered?"
        message={
          unofferTarget
            ? `${scheduleLabel(unofferTarget)} (${unofferTarget.venue}) will stop appearing as a choice to applicants.` +
              (unofferTarget.assignedApplicants.length > 0
                ? ` ${unofferTarget.assignedApplicants.length} applicant${
                    unofferTarget.assignedApplicants.length === 1 ? "" : "s"
                  } already picked this slot and will keep it; only new picks are blocked.`
                : "")
            : ""
        }
        confirmLabel="Mark not offered"
        isSubmitting={pendingToggleId === unofferTarget?.examScheduleId}
        onConfirm={confirmUnoffer}
        onCancel={() => setUnofferTarget(null)}
      />
    </AppLayout>
  );
}
