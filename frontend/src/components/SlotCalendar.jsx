import { useMemo, useState } from "react";
import { manilaToday } from "../utils/format.js";
import "./SlotCalendar.css";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function monthStart(isoDate) {
  const [year, month] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function isoOf(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * A month calendar (Philippine time) shared by the Admin and the applicant.
 *
 * Applicant: only days with an open slot can be picked. `slotDates` is the set
 * of "yyyy-mm-dd" dates with a slot; `fullDates` marks those whose every slot
 * is taken (shown, not pickable).
 *
 * Admin (`anyDate`): every day can be picked, to add slots to it. `closedDates`
 * marks days whose slots are all withdrawn (Not Offered).
 */
export default function SlotCalendar({ slotDates, fullDates = new Set(), closedDates = new Set(), anyDate = false, value, onChange }) {
  const today = manilaToday();
  const firstDate = useMemo(() => [...slotDates].sort()[0], [slotDates]);
  const [visible, setVisible] = useState(() => monthStart(value ?? firstDate ?? today));

  const year = visible.getFullYear();
  const month = visible.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Monday-first, so the weekend sits together at the right edge.
  const leading = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells = [...Array(leading).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const label = visible.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const shift = (delta) => setVisible(new Date(year, month + delta, 1));

  return (
    <div className="slot-calendar">
      <div className="slot-calendar-head">
        <h3 aria-live="polite">{label}</h3>
        <div className="slot-calendar-nav-group">
          <button type="button" className="slot-calendar-nav" onClick={() => shift(-1)} aria-label="Previous month">
            <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m10 3-5 5 5 5" />
            </svg>
          </button>
          <button type="button" className="slot-calendar-nav" onClick={() => shift(1)} aria-label="Next month">
            <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m6 3 5 5-5 5" />
            </svg>
          </button>
        </div>
      </div>

      <div className="slot-calendar-grid" role="grid" aria-label={label}>
        {WEEKDAYS.map((day) => (
          <span key={day} className="slot-calendar-weekday" role="columnheader">
            {day}
          </span>
        ))}
        {cells.map((day, index) => {
          if (day === null) return <span key={`blank-${index}`} />;
          const iso = isoOf(year, month, day);
          const hasSlots = slotDates.has(iso);
          const isFull = fullDates.has(iso);
          const isClosed = closedDates.has(iso);
          const selected = value === iso;
          const state = !hasSlots ? "no slots" : isClosed ? "not offered" : isFull ? "fully booked" : "slots available";
          return (
            <button
              key={iso}
              type="button"
              role="gridcell"
              className={
                "slot-calendar-day" +
                (hasSlots && !isFull && !isClosed ? " slot-calendar-day-open" : "") +
                (isFull && !isClosed ? " slot-calendar-day-full" : "") +
                (isClosed ? " slot-calendar-day-closed" : "") +
                (iso === today ? " slot-calendar-day-today" : "") +
                (anyDate && iso < today ? " slot-calendar-day-past" : "") +
                (selected ? " slot-calendar-day-selected" : "")
              }
              disabled={!hasSlots && !anyDate}
              aria-pressed={selected}
              aria-current={iso === today ? "date" : undefined}
              aria-label={`${new Date(year, month, day).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}, ${state}`}
              onClick={() => onChange(iso)}
            >
              {day}
            </button>
          );
        })}
      </div>

      <p className="slot-calendar-legend">
        <span className="slot-calendar-key slot-calendar-key-open" /> {anyDate ? "Offered" : "Slots open"}
        <span className="slot-calendar-key slot-calendar-key-full" /> Fully booked
        {anyDate ? (
          <>
            <span className="slot-calendar-key slot-calendar-key-closed" /> Not offered
          </>
        ) : null}
      </p>
      <p className="slot-calendar-zone">Philippine time (Asia/Manila)</p>
    </div>
  );
}
