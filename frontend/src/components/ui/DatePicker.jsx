import { useEffect, useId, useMemo, useRef, useState } from "react";
import { manilaToday } from "../../utils/format.js";
import Icon from "./Icon.jsx";
// The same month grid, arrows and day buttons as the exam and interview schedule calendars.
import "../SlotCalendar.css";
import "./DatePicker.css";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString(undefined, { month: "long" }));

function isoOf(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parts(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  return match ? { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) } : null;
}

function longDate(iso) {
  const p = parts(iso);
  return p ? new Date(p.year, p.month, p.day).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "";
}

/**
 * A date field that opens the same calendar the exam and interview schedules use, with a month and a year
 * picker in its header so a date far back (a birth date) takes two taps, not a hundred clicks on an arrow.
 *
 * `value` and `onChange` use "yyyy-mm-dd" (or "" when empty), exactly what a native date input gave, so forms
 * and the server see what they did before. `min` / `max` are "yyyy-mm-dd" too; days outside them can't be
 * picked. Other props (id, name, required, aria-*) go to the button that opens the calendar.
 */
export default function DatePicker({ id, name, value, onChange, min, max, placeholder = "Select a date", defaultView, className = "", ...rest }) {
  const today = manilaToday();
  const upper = max ?? "2100-12-31";
  const lower = min ?? "1900-01-01";
  const reactId = useId();
  const panelId = `${id ?? reactId}-calendar`;

  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => parts(value) ?? parts(defaultView) ?? parts(max && max < today ? max : today));
  const rootRef = useRef(null);
  const triggerRef = useRef(null);

  // Show the chosen date's month whenever the calendar opens.
  const openCalendar = () => {
    setView(parts(value) ?? parts(defaultView) ?? parts(max && max < today ? max : today));
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function onPointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const minYear = Number(lower.slice(0, 4));
  const maxYear = Number(upper.slice(0, 4));
  const years = useMemo(() => Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i), [minYear, maxYear]);

  const { year, month } = view;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (new Date(year, month, 1).getDay() + 6) % 7; // Monday first, like the schedule calendars
  const cells = [...Array(leading).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const go = (delta) => {
    const next = new Date(year, month + delta, 1);
    setView({ year: next.getFullYear(), month: next.getMonth(), day: 1 });
  };
  const canGoBack = isoOf(year, month, 1) > lower;
  const canGoForward = isoOf(year, month, daysInMonth) < upper;

  function pick(iso) {
    onChange(iso);
    setOpen(false);
    triggerRef.current?.focus();
  }

  const invalid = rest["aria-invalid"] === "true" || rest["aria-invalid"] === true;

  return (
    <div className={`date-picker ${invalid ? "is-invalid " : ""}${className}`.trim()} ref={rootRef}>
      <button
        {...rest}
        ref={triggerRef}
        id={id}
        name={name}
        type="button"
        className="date-picker-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => (open ? setOpen(false) : openCalendar())}
      >
        <span className={value ? "date-picker-value" : "date-picker-placeholder"}>{value ? longDate(value) : placeholder}</span>
        <Icon name="calendar" size={18} className="date-picker-icon" />
      </button>

      {open ? (
        <div className="date-picker-panel slot-calendar" id={panelId} role="dialog" aria-label="Choose a date">
          <div className="slot-calendar-head date-picker-head">
            <button type="button" className="slot-calendar-nav" onClick={() => go(-1)} disabled={!canGoBack} aria-label="Previous month">
              <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m10 3-5 5 5 5" />
              </svg>
            </button>
            <div className="date-picker-selects">
              <select aria-label="Month" value={month} onChange={(event) => setView({ year, month: Number(event.target.value), day: 1 })}>
                {MONTH_NAMES.map((name, index) => (
                  <option key={name} value={index}>
                    {name}
                  </option>
                ))}
              </select>
              <select aria-label="Year" value={year} onChange={(event) => setView({ year: Number(event.target.value), month, day: 1 })}>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="slot-calendar-nav" onClick={() => go(1)} disabled={!canGoForward} aria-label="Next month">
              <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m6 3 5 5-5 5" />
              </svg>
            </button>
          </div>

          <div className="slot-calendar-grid" role="grid" aria-label={`${MONTH_NAMES[month]} ${year}`}>
            {WEEKDAYS.map((day) => (
              <span key={day} className="slot-calendar-weekday" role="columnheader">
                {day}
              </span>
            ))}
            {cells.map((day, index) => {
              if (day === null) return <span key={`blank-${index}`} />;
              const iso = isoOf(year, month, day);
              const outOfRange = iso < lower || iso > upper;
              const selected = value === iso;
              return (
                <button
                  key={iso}
                  type="button"
                  role="gridcell"
                  className={
                    "slot-calendar-day date-picker-day" +
                    (iso === today ? " slot-calendar-day-today" : "") +
                    (selected ? " slot-calendar-day-selected" : "")
                  }
                  disabled={outOfRange}
                  aria-pressed={selected}
                  aria-current={iso === today ? "date" : undefined}
                  aria-label={new Date(year, month, day).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  onClick={() => pick(iso)}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <p className="slot-calendar-zone">Philippine time (Asia/Manila)</p>
        </div>
      ) : null}
    </div>
  );
}

// The admission form's Field wrapper marks a control invalid by cloning aria props onto it; this lets it do the same here.
DatePicker.isFormControl = true;
