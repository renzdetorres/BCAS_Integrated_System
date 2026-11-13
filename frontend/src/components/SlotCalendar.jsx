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
 *
 * The legend is a set of filters: pick Offered, Fully booked or Not offered to light up only those days (the
 * rest fade), see how many fall in the month on screen, and jump to the nearest month that has any.
 */
const KINDS = [
  { key: "open", cls: "open" },
  { key: "full", cls: "full" },
  { key: "closed", cls: "closed" },
];
export default function SlotCalendar({ slotDates, fullDates = new Set(), closedDates = new Set(), anyDate = false, value, onChange }) {
  const today = manilaToday();
  const firstDate = useMemo(() => [...slotDates].sort()[0], [slotDates]);
  const [visible, setVisible] = useState(() => monthStart(value ?? firstDate ?? today));
  const [filter, setFilter] = useState(null);

  // Which of the three states a day is in, or null when it has no slots at all.
  const kindOf = (iso) => {
    if (!slotDates.has(iso) && !closedDates.has(iso) && !fullDates.has(iso)) return null;
    if (closedDates.has(iso)) return "closed";
    if (fullDates.has(iso)) return "full";
    return slotDates.has(iso) ? "open" : null;
  };
  const datesByKind = useMemo(() => {
    const groups = { open: [], full: [], closed: [] };
    for (const iso of new Set([...slotDates, ...fullDates, ...closedDates])) {
      const kind = closedDates.has(iso) ? "closed" : fullDates.has(iso) ? "full" : slotDates.has(iso) ? "open" : null;
      if (kind) groups[kind].push(iso);
    }
    for (const key of Object.keys(groups)) groups[key].sort();
    return groups;
  }, [slotDates, fullDates, closedDates]);

  const year = visible.getFullYear();
  const month = visible.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Monday-first, so the weekend sits together at the right edge.
  const leading = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells = [...Array(leading).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const label = visible.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const shift = (delta) => setVisible(new Date(year, month + delta, 1));

  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthCount = (key) => datesByKind[key].filter((iso) => iso.startsWith(monthPrefix)).length;
  const LEGEND_LABELS = {
    open: anyDate ? "Offered" : "Slots open",
    full: "Fully booked",
    closed: "Not offered",
  };
  const legendKinds = KINDS.filter((kind) => kind.key !== "closed" || anyDate);

  // The nearest day of the chosen kind at or after this month, else the latest one before it.
  const nearest = filter
    ? datesByKind[filter].find((iso) => iso >= `${monthPrefix}-01`) ?? datesByKind[filter][datesByKind[filter].length - 1]
    : null;
  const showJump = filter && monthCount(filter) === 0 && nearest;

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
          const kind = kindOf(iso);
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
                (filter && kind !== filter ? " slot-calendar-day-dim" : "") +
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

      <div className="slot-calendar-legend" role="group" aria-label="Show days by status">
        {legendKinds.map((kind) => {
          const count = monthCount(kind.key);
          const total = datesByKind[kind.key].length;
          const active = filter === kind.key;
          return (
            <button
              key={kind.key}
              type="button"
              className={`slot-calendar-filter${active ? " is-active" : ""}`}
              aria-pressed={active}
              disabled={total === 0}
              title={total === 0 ? "None yet" : active ? "Show every day again" : `Show only days that are ${LEGEND_LABELS[kind.key].toLowerCase()}`}
              onClick={() => setFilter(active ? null : kind.key)}
            >
              <span className={`slot-calendar-key slot-calendar-key-${kind.cls}`} aria-hidden="true" />
              {LEGEND_LABELS[kind.key]}
              <span className="slot-calendar-filter-count">{count}</span>
            </button>
          );
        })}
      </div>
      {showJump ? (
        <p className="slot-calendar-jump" role="status">
          None this month.{" "}
          <button type="button" className="slot-calendar-jump-link" onClick={() => setVisible(monthStart(nearest))}>
            Go to {new Date(`${nearest}T00:00:00`).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
          </button>
        </p>
      ) : null}
      <p className="slot-calendar-zone">Philippine time (Asia/Manila)</p>
    </div>
  );
}
