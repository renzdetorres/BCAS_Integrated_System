import { useCallback, useEffect, useState } from "react";
import {
  DAY_TYPES,
  createExamSchedule,
  listExamSchedules,
  setExamScheduleOffered,
} from "../api/adminExamSchedulesApi.js";
import { ApiError } from "../api/apiClient.js";
import { useToast } from "../context/ToastContext.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";
import "./AdminExamSchedulesPage.css";

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
  const { showToast } = useToast();
  const [schedules, setSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [pendingToggleId, setPendingToggleId] = useState(null);
  const [unofferTarget, setUnofferTarget] = useState(null);

  const [form, setForm] = useState(initialForm);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createdMessage, setCreatedMessage] = useState(null);

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
    setCreatedMessage(null);
    setIsCreating(true);
    try {
      await createExamSchedule(form);
      setForm(initialForm);
      setCreatedMessage("Exam schedule created.");
      await loadSchedules();
    } catch (error) {
      setCreateError(error instanceof ApiError ? error.message : "Failed to create the exam schedule.");
    } finally {
      setIsCreating(false);
    }
  }

  async function applyToggleOffered(schedule) {
    setPendingToggleId(schedule.examScheduleId);
    setLoadError(null);
    try {
      const updated = await setExamScheduleOffered(schedule.examScheduleId, !schedule.isOffered);
      setSchedules((prev) =>
        prev.map((s) => (s.examScheduleId === updated.examScheduleId ? { ...s, isOffered: updated.isOffered } : s))
      );
      showToast(`${formatDate(schedule.examDate)} at ${schedule.examTime} is now ${updated.isOffered ? "offered" : "not offered"}.`);
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : "Failed to update the exam schedule.");
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

  return (
    <AppLayout title="Exam Schedules">
        <Card className="admin-exam-schedules-form-card">
          <h2>Add Schedule</h2>
          <p className="admin-exam-schedules-subtitle">
            Saturday schedules are always selectable. Weekday schedules also need a teacher available to
            assist - leave "Offered" checked only when one is.
          </p>

          {createdMessage && (
            <p className="form-success" role="status">
              {createdMessage}
            </p>
          )}
          {createError && (
            <p className="form-error" role="alert">
              {createError}
            </p>
          )}

          <form onSubmit={handleCreate} noValidate>
            <div className="form-row-group">
              <div className="form-row">
                <label htmlFor="dayType">Day type</label>
                <select id="dayType" name="dayType" value={form.dayType} onChange={handleFormChange}>
                  {DAY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label htmlFor="examDate">Exam date</label>
                <input
                  id="examDate"
                  name="examDate"
                  type="date"
                  required
                  value={form.examDate}
                  onChange={handleFormChange}
                />
              </div>
              <div className="form-row">
                <label htmlFor="examTime">Exam time</label>
                <input
                  id="examTime"
                  name="examTime"
                  type="time"
                  required
                  value={form.examTime}
                  onChange={handleFormChange}
                />
              </div>
            </div>

            <div className="form-row">
              <label htmlFor="venue">Venue</label>
              <input
                id="venue"
                name="venue"
                type="text"
                required
                value={form.venue}
                onChange={handleFormChange}
              />
            </div>

            {form.dayType === "Weekday" && (
              <label className="admin-exam-schedules-checkbox">
                <input type="checkbox" name="isOffered" checked={form.isOffered} onChange={handleFormChange} />
                Teacher available - offer this slot immediately
              </label>
            )}

            <button type="submit" disabled={isCreating}>
              {isCreating ? "Creating..." : "Add Schedule"}
            </button>
          </form>
        </Card>

        <Card>
          <h2>All Schedules</h2>

          {loadError && (
            <p className="form-error" role="alert">
              {loadError}
            </p>
          )}

          {isLoading ? (
            <p>Loading...</p>
          ) : schedules.length === 0 ? (
            <p>No exam schedules yet.</p>
          ) : (
            <ul className="schedule-list">
              {schedules.map((schedule) => (
                <li key={schedule.examScheduleId} className="schedule-row">
                  <div className="schedule-header">
                    <div>
                      <span className={`daytype-badge daytype-${schedule.dayType.toLowerCase()}`}>
                        {schedule.dayType}
                      </span>
                      <span className="schedule-datetime">
                        {formatDate(schedule.examDate)} at {schedule.examTime}
                      </span>
                    </div>
                    {schedule.dayType === "Weekday" && (
                      <button
                        type="button"
                        className={schedule.isOffered ? "toggle-offered-on" : "toggle-offered-off"}
                        onClick={() => handleToggleOffered(schedule)}
                        disabled={pendingToggleId === schedule.examScheduleId}
                      >
                        {pendingToggleId === schedule.examScheduleId
                          ? "Saving..."
                          : schedule.isOffered
                            ? "Offered"
                            : "Not Offered"}
                      </button>
                    )}
                  </div>
                  <p className="schedule-venue">{schedule.venue}</p>

                  <div className="schedule-applicants">
                    <span className="schedule-applicants-count">
                      {schedule.assignedApplicants.length} applicant
                      {schedule.assignedApplicants.length === 1 ? "" : "s"} assigned
                    </span>
                    {schedule.assignedApplicants.length > 0 && (
                      <ul className="applicant-list">
                        {schedule.assignedApplicants.map((applicant) => (
                          <li key={applicant.applicantEmail}>
                            <span className="applicant-name">{applicant.applicantName}</span>
                            <span className="applicant-email">{applicant.applicantEmail}</span>
                            <span className="applicant-selected-at">
                              Selected {formatDateTime(applicant.selectedAt)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

      <ConfirmDialog
        open={Boolean(unofferTarget)}
        title="Mark this schedule as not offered?"
        message={
          unofferTarget
            ? `${formatDate(unofferTarget.examDate)} at ${unofferTarget.examTime} (${unofferTarget.venue}) will stop appearing as a choice to applicants.` +
              (unofferTarget.assignedApplicants.length > 0
                ? ` ${unofferTarget.assignedApplicants.length} applicant${
                    unofferTarget.assignedApplicants.length === 1 ? "" : "s"
                  } already selected this slot and will keep it - only new selections are blocked.`
                : "")
            : ""
        }
        confirmLabel="Mark Not Offered"
        isSubmitting={pendingToggleId === unofferTarget?.examScheduleId}
        onConfirm={confirmUnoffer}
        onCancel={() => setUnofferTarget(null)}
      />
    </AppLayout>
  );
}
