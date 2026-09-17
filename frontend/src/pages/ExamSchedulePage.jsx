import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAvailableExamSchedules,
  getMyExamScheduleSelection,
  selectExamSchedule,
} from "../api/examScheduleApi.js";
import { ApiError } from "../api/apiClient.js";
import "./ExamSchedulePage.css";

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(isoTime) {
  const [hours, minutes] = isoTime.split(":").map(Number);
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ExamSchedulePage() {
  const [schedules, setSchedules] = useState([]);
  const [selection, setSelection] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getAvailableExamSchedules(), getMyExamScheduleSelection()])
      .then(([scheduleData, selectionData]) => {
        if (cancelled) return;
        setSchedules(scheduleData);
        setSelection(selectionData);
        setSelectedId(
          String(selectionData?.examScheduleId ?? scheduleData[0]?.examScheduleId ?? "")
        );
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof ApiError ? error.message : "Failed to load exam schedules.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const confirmed = await selectExamSchedule(Number(selectedId));
      setSelection(confirmed);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="exam-schedule-page">
      <div className="exam-schedule-shell">
        <Link className="exam-schedule-back-link" to="/portal">
          &larr; Back to dashboard
        </Link>

        <section className="exam-schedule-card">
          <h1>Entrance Exam Schedule</h1>

          {selection && (
            <div className="exam-schedule-confirmed">
              <p className="exam-schedule-confirmed-label">Your confirmed schedule</p>
              <p className="exam-schedule-confirmed-date">{formatDate(selection.examDate)}</p>
              <p className="exam-schedule-confirmed-time">{formatTime(selection.examTime)}</p>
            </div>
          )}

          {errorMessage && (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          )}

          {!isLoading && schedules.length === 0 && !errorMessage && (
            <p>No exam schedules are currently available. Please check back later.</p>
          )}

          {(isLoading || schedules.length > 0) && (
            <form onSubmit={handleSubmit} noValidate>
              <div className="form-row">
                <label htmlFor="examScheduleId">
                  {selection ? "Choose a different schedule" : "Choose a schedule"}
                </label>
                <select
                  id="examScheduleId"
                  name="examScheduleId"
                  value={selectedId}
                  onChange={(event) => setSelectedId(event.target.value)}
                  disabled={isLoading}
                  required
                >
                  {schedules.map((s) => (
                    <option key={s.examScheduleId} value={s.examScheduleId}>
                      {s.dayType} &middot; {formatDate(s.examDate)} &middot; {formatTime(s.examTime)}
                    </option>
                  ))}
                </select>
              </div>

              <button type="submit" disabled={isSubmitting || isLoading || schedules.length === 0}>
                {isSubmitting ? "Confirming..." : selection ? "Change Schedule" : "Confirm Schedule"}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
