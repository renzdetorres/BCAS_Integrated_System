import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EXAM_STATUSES,
  createExamSchedule,
  deleteExamSchedule,
  listExamSchedules,
  setApplicantExamStatus,
  setExamDateOffered,
  setExamScheduleOffered,
  updateExamSchedule,
} from "../api/adminExamSchedulesApi.js";
import { ApiError } from "../api/apiClient.js";
import { useToast } from "../context/ToastContext.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import SlotCalendar from "../components/SlotCalendar.jsx";
import Card from "../components/ui/Card.jsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";
import DataTable, { PersonCell, RowAction } from "../components/ui/DataTable.jsx";
import Icon from "../components/ui/Icon.jsx";
import Modal from "../components/ui/Modal.jsx";
import { formatDayHeading, formatLongDate, formatTime, formatDateTime, manilaToday } from "../utils/format.js";
import "./AdminExamSchedulesPage.css";

// The four times the school normally runs; one click adds them all to a date.
const STANDARD_TIMES = ["08:00", "09:45", "13:00", "14:45"];

// Counts the same applicants the server does when it decides a slot is full.
const takenOf = (slot) => slot.assignedApplicants.filter((a) => a.examStatus === "Scheduled" || a.examStatus === "ExamDone").length;
const isFull = (slot) => slot.capacity != null && takenOf(slot) >= slot.capacity;
const seatsText = (slot) => (slot.capacity == null ? `${takenOf(slot)} booked` : `${takenOf(slot)} of ${slot.capacity} booked`);
const bookedCount = (slot) => slot.assignedApplicants.length;
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

function slotLabel(slot) {
  return `${formatLongDate(slot.examDate)} at ${formatTime(slot.examTime)}`;
}

function errorText(error, fallback) {
  return error instanceof ApiError ? error.message : fallback;
}

/** Add a slot, or change one's time and seats. */
function SlotModal({ slot, date, onClose, onSaved }) {
  const isEdit = Boolean(slot);
  const [examTime, setExamTime] = useState(slot ? slot.examTime.slice(0, 5) : "");
  const [capacity, setCapacity] = useState(slot?.capacity ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const moving = isEdit && examTime !== slot.examTime.slice(0, 5);
  const booked = isEdit ? bookedCount(slot) : 0;

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    if (!examTime) {
      setErrorMessage("Choose a time.");
      return;
    }
    setIsSaving(true);
    try {
      if (isEdit) {
        await updateExamSchedule(slot.examScheduleId, { examTime, capacity });
      } else {
        await createExamSchedule({ examDate: date, examTime, capacity });
      }
      onSaved(isEdit ? "Time slot updated." : `Time slot added for ${formatLongDate(date)}.`);
    } catch (error) {
      setErrorMessage(errorText(error, "Failed to save the time slot."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      busy={isSaving}
      title={isEdit ? "Edit time slot" : "Add time slot"}
      subtitle={`${formatDayHeading(isEdit ? slot.examDate : date)} · Philippine time`}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="submit" form="slot-form" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? "Saving..." : isEdit ? "Save changes" : "Add slot"}
          </button>
        </>
      }
    >
      <form id="slot-form" onSubmit={handleSubmit} noValidate>
        {errorMessage ? (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className="ui-field-row">
          <div className="ui-field">
            <label className="ui-label" htmlFor="slotTime">
              Time
            </label>
            <input id="slotTime" type="time" className="ui-input" value={examTime} onChange={(e) => setExamTime(e.target.value)} data-autofocus />
          </div>
          <div className="ui-field">
            <label className="ui-label" htmlFor="slotSeats">
              Seats (optional)
            </label>
            <input
              id="slotSeats"
              type="number"
              min="1"
              max="5000"
              className="ui-input"
              placeholder="No limit"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </div>
        </div>
        <p className="ui-hint">Once the seats are taken, applicants can no longer book this time.</p>
        {moving && booked > 0 ? (
          <p className="exam-warning" role="status">
            <Icon name="alert" size={16} />
            {plural(booked, "applicant")} booked this slot. Changing the time moves them with it, and they are emailed the new time.
          </p>
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
      title={`Applicants for ${slotLabel(schedule)}`}
      subtitle={plural(applicants.length, "applicant")}
      footer={
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      }
    >
      {applicants.length === 0 ? (
        <p className="exam-empty">No applicant has booked this slot yet.</p>
      ) : (
        <ol className="exam-applicant-list">
          {applicants.map((applicant) => (
            <li key={applicant.applicantEmail}>
              <PersonCell name={applicant.applicantName} detail={applicant.applicantEmail} />
              <div className="exam-applicant-side">
                <span className="exam-applicant-date">Booked {formatDateTime(applicant.selectedAt)}</span>
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

function OfferSwitch({ checked, onChange, disabled, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className="exam-switch" onClick={onChange} disabled={disabled}>
      <span className="exam-switch-track" aria-hidden="true">
        <span className="exam-switch-thumb" />
      </span>
      {label ?? (checked ? "Offered" : "Not offered")}
    </button>
  );
}

export default function AdminExamSchedulesPage() {
  const { showToast } = useToast();
  const [schedules, setSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [date, setDate] = useState(manilaToday);
  const [busyKey, setBusyKey] = useState(null);
  const [slotModal, setSlotModal] = useState(null); // { slot } - slot is null when adding
  const [viewing, setViewing] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [withdrawTarget, setWithdrawTarget] = useState(null); // { date } or { slot }
  const [pendingStatusUserId, setPendingStatusUserId] = useState(null);
  const [offerFilter, setOfferFilter] = useState("");

  const loadSchedules = useCallback(async () => {
    try {
      setSchedules(await listExamSchedules());
      setLoadError(null);
    } catch (error) {
      setLoadError(errorText(error, "Failed to load exam schedules."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const { slotDates, fullDates, closedDates, byDate } = useMemo(() => {
    const grouped = new Map();
    for (const slot of schedules) {
      if (!grouped.has(slot.examDate)) grouped.set(slot.examDate, []);
      grouped.get(slot.examDate).push(slot);
    }
    const closed = new Set();
    const full = new Set();
    for (const [day, slots] of grouped) {
      const offered = slots.filter((s) => s.isOffered);
      if (offered.length === 0) closed.add(day);
      else if (offered.every(isFull)) full.add(day);
    }
    return { slotDates: new Set(grouped.keys()), fullDates: full, closedDates: closed, byDate: grouped };
  }, [schedules]);

  const daySlots = byDate.get(date) ?? [];
  const dayOffered = daySlots.some((s) => s.isOffered);
  const dayPast = date < manilaToday();

  async function run(key, work, successMessage, failureMessage) {
    setBusyKey(key);
    try {
      await work();
      await loadSchedules();
      if (successMessage) showToast(successMessage);
    } catch (error) {
      showToast(errorText(error, failureMessage), "error");
    } finally {
      setBusyKey(null);
    }
  }

  function toggleDate() {
    if (dayOffered && daySlots.some((s) => bookedCount(s) > 0)) {
      setWithdrawTarget({ date });
      return;
    }
    applyDateOffered(!dayOffered);
  }

  function applyDateOffered(isOffered) {
    return run(
      `date:${date}`,
      () => setExamDateOffered(date, isOffered),
      `${formatLongDate(date)} is now ${isOffered ? "offered" : "not offered"}.`,
      "Failed to update the exam date.",
    );
  }

  function toggleSlot(slot) {
    if (slot.isOffered && bookedCount(slot) > 0) {
      setWithdrawTarget({ slot });
      return;
    }
    applySlotOffered(slot, !slot.isOffered);
  }

  function applySlotOffered(slot, isOffered) {
    return run(
      `slot:${slot.examScheduleId}`,
      () => setExamScheduleOffered(slot.examScheduleId, isOffered),
      `${slotLabel(slot)} is now ${isOffered ? "offered" : "not offered"}.`,
      "Failed to update the time slot.",
    );
  }

  async function confirmWithdraw() {
    const target = withdrawTarget;
    setWithdrawTarget(null);
    if (target.slot) await applySlotOffered(target.slot, false);
    else await applyDateOffered(false);
  }

  async function confirmRemove() {
    const slot = removeTarget;
    setRemoveTarget(null);
    await run(`slot:${slot.examScheduleId}`, () => deleteExamSchedule(slot.examScheduleId), `${slotLabel(slot)} removed.`, "Failed to remove the time slot.");
  }

  async function addStandardTimes() {
    const existing = new Set(daySlots.map((s) => s.examTime.slice(0, 5)));
    const missing = STANDARD_TIMES.filter((time) => !existing.has(time));
    await run(
      `date:${date}`,
      async () => {
        for (const time of missing) {
          await createExamSchedule({ examDate: date, examTime: time });
        }
      },
      `Added ${plural(missing.length, "time slot")} to ${formatLongDate(date)}.`,
      "Failed to add the standard times.",
    );
  }

  async function handleExamStatus(applicant, status) {
    setPendingStatusUserId(applicant.userId);
    try {
      await setApplicantExamStatus(applicant.userId, status);
      await loadSchedules();
      showToast(`${applicant.applicantName} marked ${EXAM_STATUSES.find((s) => s.value === status)?.label ?? status}.`);
    } catch (error) {
      showToast(errorText(error, "Failed to update the exam status."), "error");
    } finally {
      setPendingStatusUserId(null);
    }
  }

  const rows = useMemo(
    () => schedules.filter((s) => !offerFilter || (offerFilter === "offered" ? s.isOffered : !s.isOffered)),
    [schedules, offerFilter],
  );

  const columns = [
    {
      key: "examDate",
      header: "Date",
      accessor: (row) => `${row.examDate}T${row.examTime}`,
      sortable: true,
      searchable: false,
      render: (row) => formatLongDate(row.examDate),
    },
    {
      key: "time",
      header: "Time",
      accessor: (row) => row.examTime,
      sortable: true,
      searchable: false,
      render: (row) => formatTime(row.examTime),
    },
    {
      key: "booked",
      header: "Booked",
      accessor: (row) => takenOf(row),
      sortable: true,
      searchable: false,
      render: (row) => (row.capacity == null ? takenOf(row) : `${takenOf(row)} / ${row.capacity}`),
    },
    {
      key: "offered",
      header: "Availability",
      accessor: (row) => (row.isOffered ? "Offered" : "Not offered"),
      sortable: true,
      render: (row) => (
        <OfferSwitch
          checked={row.isOffered}
          disabled={busyKey === `slot:${row.examScheduleId}`}
          onChange={(event) => {
            event.stopPropagation();
            toggleSlot(row);
          }}
        />
      ),
    },
    {
      key: "action",
      header: "Action",
      searchable: false,
      render: (row) => (
        <RowAction label="Applicants" icon="users" onClick={() => setViewing(row)} ariaLabel={`View applicants for ${slotLabel(row)}`} />
      ),
    },
  ];

  const withdrawBooked = withdrawTarget?.slot
    ? bookedCount(withdrawTarget.slot)
    : (byDate.get(withdrawTarget?.date) ?? []).reduce((sum, s) => sum + bookedCount(s), 0);

  return (
    <AppLayout>
      <Card className="exam-admin-card">
        <div className="exam-admin-booking">
          <div className="exam-admin-calendar">
            <SlotCalendar
              anyDate
              slotDates={slotDates}
              fullDates={fullDates}
              closedDates={closedDates}
              value={date}
              onChange={setDate}
            />
          </div>

          <section className="exam-admin-day" aria-labelledby="exam-day-heading">
            <header className="exam-admin-day-head">
              <div>
                <h2 id="exam-day-heading" className="exam-admin-day-title">
                  {formatDayHeading(date)}
                </h2>
                <p className="exam-admin-day-sub">
                  {daySlots.length === 0
                    ? "No time slots yet"
                    : `${plural(daySlots.length, "time slot")} · ${dayOffered ? "Applicants can book this date" : "Not offered to applicants"}`}
                </p>
              </div>
              {daySlots.length > 0 ? (
                <OfferSwitch
                  checked={dayOffered}
                  disabled={busyKey === `date:${date}` || dayPast}
                  onChange={toggleDate}
                  label={dayOffered ? "Offered" : "Not offered"}
                />
              ) : null}
            </header>

            {dayPast ? <p className="exam-admin-note">This date has passed. Slots can be reviewed but not added.</p> : null}

            {daySlots.length > 0 ? (
              <ul className="exam-admin-slots">
                {daySlots.map((slot) => {
                  const busy = busyKey === `slot:${slot.examScheduleId}`;
                  return (
                    <li key={slot.examScheduleId} className={`exam-admin-slot${slot.isOffered ? "" : " exam-admin-slot-off"}`}>
                      <span className="exam-admin-slot-time">{formatTime(slot.examTime)}</span>
                      <span className="exam-admin-slot-seats">
                        {seatsText(slot)}
                        {isFull(slot) ? <span className="exam-admin-slot-tag exam-admin-slot-tag-full">Full</span> : null}
                        {!slot.isOffered ? <span className="exam-admin-slot-tag">Not offered</span> : null}
                      </span>
                      <span className="exam-admin-slot-actions">
                        <button
                          type="button"
                          className="exam-icon-button"
                          onClick={() => setViewing(slot)}
                          aria-label={`View applicants for ${slotLabel(slot)}`}
                          title="Applicants"
                        >
                          <Icon name="users" size={16} />
                        </button>
                        <button
                          type="button"
                          className="exam-icon-button"
                          onClick={() => setSlotModal({ slot })}
                          disabled={busy}
                          aria-label={`Edit ${slotLabel(slot)}`}
                          title="Edit time and seats"
                        >
                          <Icon name="pencil" size={16} />
                        </button>
                        <button
                          type="button"
                          className="exam-icon-button exam-icon-button-danger"
                          onClick={() => setRemoveTarget(slot)}
                          disabled={busy || bookedCount(slot) > 0}
                          aria-label={`Remove ${slotLabel(slot)}`}
                          title={bookedCount(slot) > 0 ? "Applicants have booked this slot" : "Remove slot"}
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="exam-admin-empty">Add the times applicants can choose for this date.</p>
            )}

            <div className="exam-admin-add">
              <button type="button" className="btn btn-primary" onClick={() => setSlotModal({ slot: null })} disabled={dayPast}>
                <Icon name="plus" size={16} />
                Add time slot
              </button>
              {daySlots.length === 0 ? (
                <button type="button" className="btn btn-secondary" onClick={addStandardTimes} disabled={dayPast || busyKey === `date:${date}`}>
                  Add standard times
                </button>
              ) : null}
            </div>
            {daySlots.length === 0 && !dayPast ? (
              <p className="exam-admin-note">Standard times: {STANDARD_TIMES.map(formatTime).join(", ")}.</p>
            ) : null}
          </section>
        </div>
      </Card>

      <DataTable
        title="All exam slots"
        subtitle="Every date and time applicants can book, and who has booked each one."
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.examScheduleId}
        isLoading={isLoading}
        errorMessage={loadError}
        emptyMessage={schedules.length === 0 ? "No exam slots yet. Pick a date on the calendar to add one." : "No slots match this filter."}
        onRowClick={(row) => setDate(row.examDate)}
        filters={[
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

      {slotModal ? (
        <SlotModal
          slot={slotModal.slot}
          date={date}
          onClose={() => setSlotModal(null)}
          onSaved={async (message) => {
            setSlotModal(null);
            showToast(message);
            await loadSchedules();
          }}
        />
      ) : null}

      {viewing ? (
        <ApplicantsModal
          schedule={schedules.find((s) => s.examScheduleId === viewing.examScheduleId) ?? viewing}
          onClose={() => setViewing(null)}
          onChangeStatus={handleExamStatus}
          pendingUserId={pendingStatusUserId}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(withdrawTarget)}
        title="Mark as not offered?"
        message={
          withdrawTarget
            ? `${withdrawTarget.slot ? slotLabel(withdrawTarget.slot) : formatLongDate(withdrawTarget.date)} will stop appearing to applicants. ` +
              `${plural(withdrawBooked, "applicant")} already booked and will keep their slot; only new bookings are blocked. ` +
              "Move them to another date first if they should not attend."
            : ""
        }
        confirmLabel="Mark not offered"
        isSubmitting={Boolean(busyKey)}
        onConfirm={confirmWithdraw}
        onCancel={() => setWithdrawTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Remove this time slot?"
        message={removeTarget ? `${slotLabel(removeTarget)} will be deleted. Nobody has booked it.` : ""}
        confirmLabel="Remove slot"
        isSubmitting={Boolean(busyKey)}
        onConfirm={confirmRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </AppLayout>
  );
}
