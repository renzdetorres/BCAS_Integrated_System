import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/layout/AppShell.jsx";
import Card from "../components/ui/Card.jsx";
import { inputClasses, labelClasses, primaryButtonClasses } from "../lib/formStyles.js";
import { getAvailableExamSchedules, getMyExamScheduleSelection, selectExamSchedule } from "../api/examScheduleApi.js";
import { ApiError } from "../api/apiClient.js";

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
        setSelectedId(String(selectionData?.examScheduleId ?? scheduleData[0]?.examScheduleId ?? ""));
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
    <AppShell>
      <h1 className="text-2xl font-extrabold text-slate-900">Entrance Exam Schedule</h1>

      <Card className="mt-6">
        {selection && (
          <div className="mb-6 rounded-lg bg-status-greenBg p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-status-green">Your confirmed schedule</p>
            <p className="mt-1 font-bold text-slate-900">{formatDate(selection.examDate)}</p>
            <p className="text-sm text-slate-600">{formatTime(selection.examTime)}</p>
            <Link to="/exam-permit" className="mt-2 inline-block text-sm font-semibold text-forest hover:underline">
              View my exam permit →
            </Link>
          </div>
        )}

        {errorMessage && (
          <p className="mb-4 text-sm font-medium text-status-red" role="alert">
            {errorMessage}
          </p>
        )}

        {!isLoading && schedules.length === 0 && !errorMessage && (
          <p className="text-sm text-slate-400">No exam schedules are currently available. Please check back later.</p>
        )}

        {(isLoading || schedules.length > 0) && (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label className={labelClasses} htmlFor="examScheduleId">
                {selection ? "Choose a different schedule" : "Choose a schedule"}
              </label>
              <select
                id="examScheduleId"
                name="examScheduleId"
                className={inputClasses}
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
                disabled={isLoading}
                required
              >
                {schedules.map((s) => (
                  <option key={s.examScheduleId} value={s.examScheduleId}>
                    {s.dayType} · {formatDate(s.examDate)} · {formatTime(s.examTime)} · {s.venue}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" disabled={isSubmitting || isLoading || schedules.length === 0} className={primaryButtonClasses}>
              {isSubmitting ? "Confirming..." : selection ? "Change Schedule" : "Confirm Schedule"}
            </button>
          </form>
        )}
      </Card>
    </AppShell>
  );
}
