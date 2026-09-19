import { useCallback, useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell.jsx";
import Card from "../components/ui/Card.jsx";
import Modal from "../components/ui/Modal.jsx";
import { inputClasses, labelClasses, primaryButtonClasses, outlineButtonClasses } from "../lib/formStyles.js";
import { DAY_TYPES, createExamSchedule, listExamSchedules, setExamScheduleOffered } from "../api/adminExamSchedulesApi.js";
import { ApiError } from "../api/apiClient.js";

const initialForm = { dayType: DAY_TYPES[0], examDate: "", examTime: "", venue: "", isOffered: true };

function formatDate(isoDate) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(isoDateTime) {
  return new Date(isoDateTime).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminExamSchedulesPage() {
  const [schedules, setSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [pendingToggleId, setPendingToggleId] = useState(null);

  const [isCreateOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

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

  function handleFormChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleCreate(event) {
    event.preventDefault();
    setCreateError(null);
    setIsCreating(true);
    try {
      await createExamSchedule(form);
      setForm(initialForm);
      setCreateOpen(false);
      await loadSchedules();
    } catch (error) {
      setCreateError(error instanceof ApiError ? error.message : "Failed to create the exam schedule.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleToggleOffered(schedule) {
    setPendingToggleId(schedule.examScheduleId);
    setLoadError(null);
    try {
      const updated = await setExamScheduleOffered(schedule.examScheduleId, !schedule.isOffered);
      setSchedules((prev) =>
        prev.map((s) => (s.examScheduleId === updated.examScheduleId ? { ...s, isOffered: updated.isOffered } : s))
      );
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : "Failed to update the exam schedule.");
    } finally {
      setPendingToggleId(null);
    }
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Exam Schedules</h1>
          <p className="mt-1 text-sm text-slate-500">Create and manage entrance exam schedules.</p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest-dark"
        >
          + Add Schedule
        </button>
      </div>

      {loadError && (
        <p className="mt-4 text-sm font-medium text-status-red" role="alert">
          {loadError}
        </p>
      )}

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-slate-400">Loading...</p>}
        {!isLoading && schedules.length === 0 && <p className="text-sm text-slate-400">No exam schedules yet.</p>}
        {!isLoading &&
          schedules.map((schedule) => (
            <Card key={schedule.examScheduleId}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                      {schedule.dayType}
                    </span>
                    <span className="font-bold text-slate-900">
                      {formatDate(schedule.examDate)} at {schedule.examTime}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{schedule.venue}</p>
                </div>
                {schedule.dayType === "Weekday" && (
                  <button
                    type="button"
                    onClick={() => handleToggleOffered(schedule)}
                    disabled={pendingToggleId === schedule.examScheduleId}
                    className={
                      schedule.isOffered
                        ? `${outlineButtonClasses} !border-status-green !text-status-green`
                        : `${outlineButtonClasses} !border-status-red !text-status-red`
                    }
                  >
                    {pendingToggleId === schedule.examScheduleId
                      ? "Saving..."
                      : schedule.isOffered
                        ? "Offered"
                        : "Not Offered"}
                  </button>
                )}
              </div>

              <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {schedule.assignedApplicants.length} applicant{schedule.assignedApplicants.length === 1 ? "" : "s"}{" "}
                  assigned
                </p>
                {schedule.assignedApplicants.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {schedule.assignedApplicants.map((applicant) => (
                      <li key={applicant.applicantEmail} className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium text-slate-800">{applicant.applicantName}</span>
                        <span className="text-slate-400">{applicant.applicantEmail}</span>
                        <span className="text-xs text-slate-400">Selected {formatDateTime(applicant.selectedAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          ))}
      </div>

      {isCreateOpen && (
        <Modal title="Add Schedule" onClose={() => setCreateOpen(false)}>
          <p className="text-sm text-slate-500">
            Saturday schedules are always selectable. Weekday schedules also need a teacher available to assist —
            leave "Offered" checked only when one is.
          </p>
          <form onSubmit={handleCreate} noValidate className="mt-4 space-y-4">
            <div>
              <label className={labelClasses} htmlFor="dayType">
                Day type
              </label>
              <select id="dayType" name="dayType" className={inputClasses} value={form.dayType} onChange={handleFormChange}>
                {DAY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClasses} htmlFor="examDate">
                  Exam date
                </label>
                <input
                  id="examDate"
                  name="examDate"
                  type="date"
                  required
                  className={inputClasses}
                  value={form.examDate}
                  onChange={handleFormChange}
                />
              </div>
              <div>
                <label className={labelClasses} htmlFor="examTime">
                  Exam time
                </label>
                <input
                  id="examTime"
                  name="examTime"
                  type="time"
                  required
                  className={inputClasses}
                  value={form.examTime}
                  onChange={handleFormChange}
                />
              </div>
            </div>
            <div>
              <label className={labelClasses} htmlFor="venue">
                Venue
              </label>
              <input
                id="venue"
                name="venue"
                type="text"
                required
                className={inputClasses}
                value={form.venue}
                onChange={handleFormChange}
              />
            </div>

            {form.dayType === "Weekday" && (
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="isOffered" checked={form.isOffered} onChange={handleFormChange} />
                Teacher available — offer this slot immediately
              </label>
            )}

            {createError && (
              <p className="text-sm font-medium text-status-red" role="alert">
                {createError}
              </p>
            )}

            <button type="submit" disabled={isCreating} className={`${primaryButtonClasses} w-full`}>
              {isCreating ? "Creating..." : "Add Schedule"}
            </button>
          </form>
        </Modal>
      )}
    </AppShell>
  );
}
