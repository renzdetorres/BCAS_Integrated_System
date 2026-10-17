import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAvailableExamSchedules,
  getMyExamScheduleSelection,
  selectExamSchedule,
} from "../api/examScheduleApi.js";
import { getMyExamPayment } from "../api/examPaymentApi.js";
import { ApiError } from "../api/apiClient.js";
import { formatCalendarDate } from "../utils/format.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import SlotCalendar from "../components/SlotCalendar.jsx";
import Card from "../components/ui/Card.jsx";
import Notice from "../components/ui/Notice.jsx";
import "./ExamSchedulePage.css";

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
  const [payment, setPayment] = useState(null);
  const [date, setDate] = useState(null);
  const [slotId, setSlotId] = useState(null);
  const [examType, setExamType] = useState("Entrance Exam");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadSchedules() {
    const data = await getAvailableExamSchedules();
    setSchedules(data);
    return data;
  }

  useEffect(() => {
    let cancelled = false;

    Promise.all([getAvailableExamSchedules(), getMyExamScheduleSelection(), getMyExamPayment().catch(() => null)])
      .then(([scheduleData, selectionData, paymentData]) => {
        if (cancelled) return;
        setSchedules(scheduleData);
        setSelection(selectionData);
        setPayment(paymentData);
        const firstOpen = scheduleData.find((s) => !s.isFull);
        setDate(selectionData?.examDate ?? firstOpen?.examDate ?? scheduleData[0]?.examDate ?? null);
        setSlotId(selectionData?.examScheduleId ?? null);
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

  const { slotDates, fullDates } = useMemo(() => {
    const dates = new Set(schedules.map((s) => s.examDate));
    const full = new Set([...dates].filter((d) => schedules.filter((s) => s.examDate === d).every((s) => s.isFull)));
    return { slotDates: dates, fullDates: full };
  }, [schedules]);

  const slotsForDate = schedules.filter((s) => s.examDate === date);
  // The entrance exam fee gates entrance exam slots only; the scholarship exam has none.
  const paymentBlocks = examType === "Entrance Exam" && payment?.required && payment.status !== "Verified" && !selection;

  function handleDate(nextDate) {
    setDate(nextDate);
    setSlotId(null);
    setErrorMessage(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!slotId) {
      setErrorMessage("Choose a time slot first.");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const confirmed = await selectExamSchedule(Number(slotId), examType);
      setSelection(confirmed);
      await loadSchedules();
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
      // The slot may have just filled up: show the real seat counts again.
      loadSchedules().catch(() => {});
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppLayout title="Entrance Exam Schedule">
      <Card className="exam-schedule-card">
        {selection && (
          <div className="exam-schedule-confirmed">
            <p className="exam-schedule-confirmed-label">Your confirmed schedule &middot; {selection.examType}</p>
            <p className="exam-schedule-confirmed-date">{formatCalendarDate(selection.examDate)}</p>
            <p className="exam-schedule-confirmed-time">{formatTime(selection.examTime)}</p>
            <Link to="/exam-permit">View my exam permit</Link>
          </div>
        )}

        {paymentBlocks && (
          <Notice tone="warning" title="Pay the entrance exam fee first">
            Your payment has to be verified before you can take a slot.{" "}
            <Link to="/payment">Go to Payment</Link>.
          </Notice>
        )}

        {errorMessage && (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        )}

        {!isLoading && schedules.length === 0 && !errorMessage && (
          <p>No exam schedules are currently available. Please check back later.</p>
        )}

        {!isLoading && schedules.length > 0 && (
          <form onSubmit={handleSubmit} noValidate className="exam-booking">
            <div className="exam-booking-calendar">
              <h2 className="exam-booking-heading">{selection ? "Choose a different date" : "Choose a date"}</h2>
              <SlotCalendar slotDates={slotDates} fullDates={fullDates} value={date} onChange={handleDate} />
            </div>

            <div className="exam-booking-slots">
              <h2 className="exam-booking-heading">{date ? formatCalendarDate(date) : "Choose a time"}</h2>

              {!date && <p className="form-note">Pick a highlighted day to see its time slots.</p>}

              {date && (
                <fieldset className="choice-group">
                  <legend className="exam-booking-legend">Available times</legend>
                  <div className="exam-slot-list">
                    {slotsForDate.map((slot) => (
                      <label
                        key={slot.examScheduleId}
                        className={`exam-slot${String(slotId) === String(slot.examScheduleId) ? " exam-slot-checked" : ""}${slot.isFull ? " exam-slot-full" : ""}`}
                      >
                        <input
                          type="radio"
                          name="slot"
                          value={slot.examScheduleId}
                          disabled={slot.isFull}
                          checked={String(slotId) === String(slot.examScheduleId)}
                          onChange={() => setSlotId(slot.examScheduleId)}
                        />
                        <span className="exam-slot-time">{formatTime(slot.examTime)}</span>
                        <span className="exam-slot-seats">
                          {slot.isFull ? "Full" : slot.seatsLeft == null ? "Open" : `${slot.seatsLeft} seat${slot.seatsLeft === 1 ? "" : "s"} left`}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              <div className="form-row exam-booking-type">
                <label htmlFor="examType">Type of exam</label>
                <select id="examType" name="examType" value={examType} onChange={(event) => setExamType(event.target.value)}>
                  <option value="Entrance Exam">Entrance Exam</option>
                  <option value="Scholarship Exam">Scholarship Exam</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary" disabled={isSubmitting || !slotId || paymentBlocks}>
                {isSubmitting ? "Confirming..." : selection ? "Change schedule" : "Confirm schedule"}
              </button>
            </div>
          </form>
        )}
      </Card>
    </AppLayout>
  );
}
