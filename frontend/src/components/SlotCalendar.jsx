import { useMemo, useState } from "react";
import "./SlotCalendar.css";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function monthStart(isoDate) {
  const [year, month] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function isoOf(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * A month calendar where only days that have an open slot can be picked.
 * `slotDates` is the set of "yyyy-mm-dd" dates with at least one slot;
 * `fullDates` marks the ones whose every slot is taken (shown, not pickable).
 */
export default function SlotCalendar({ slotDates, fullDates, value, onChange }) {
  const firstDate = useMemo(() => [...slotDates].sort()[0], [slotDates]);
  const [visible, setVisible] = useState(() => monthStart(value ?? firstDate ?? isoOf(new Date().getFullYear(), new Date().getMonth(), 1)));

  const year = visible.getFullYear();
  const month = visible.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = new Date(year, month, 1).getDay();
  const cells = [...Array(leading).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const label = visible.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const shift = (delta) => setVisible(new Date(year, month + delta, 1));

  return (
    <div className="slot-calendar">
      <div className="slot-calendar-head">
        <button type="button" className="slot-calendar-nav" onClick={() => shift(-1)} aria-label="Previous month">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m10 3-5 5 5 5" />
          </svg>
        </button>
        <h3 aria-live="polite">{label}</h3>
        <button type="button" className="slot-calendar-nav" onClick={() => shift(1)} aria-label="Next month">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 3 5 5-5 5" />
          </svg>
        </button>
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
          const selected = value === iso;
          return (
            <button
              key={iso}
              type="button"
              role="gridcell"
              className={
                "slot-calendar-day" +
                (hasSlots && !isFull ? " slot-calendar-day-open" : "") +
                (isFull ? " slot-calendar-day-full" : "") +
                (selected ? " slot-calendar-day-selected" : "")
              }
              disabled={!hasSlots}
              aria-pressed={selected}
              aria-label={`${new Date(year, month, day).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}${
                hasSlots ? (isFull ? ", fully booked" : ", slots available") : ", no slots"
              }`}
              onClick={() => onChange(iso)}
            >
              {day}
            </button>
          );
        })}
      </div>

      <p className="slot-calendar-legend">
        <span className="slot-calendar-key slot-calendar-key-open" /> Slots open
        <span className="slot-calendar-key slot-calendar-key-full" /> Fully booked
      </p>
    </div>
  );
}
