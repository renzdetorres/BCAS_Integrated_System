// One way to show dates and times across the system, so a date in a table,
// a modal and a toast always reads the same.

/** "Sep 2, 2026" - from a DateTime string. */
export function formatDate(isoDateTime) {
  if (!isoDateTime) return "";
  return new Date(isoDateTime).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** "Sep 2, 2026, 3:40 PM" - from a DateTime string. */
export function formatDateTime(isoDateTime) {
  if (!isoDateTime) return "";
  return new Date(isoDateTime).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "Sat, Sep 2, 2026" - from a date-only "yyyy-mm-dd" string, read as a calendar date (no timezone shift). */
export function formatCalendarDate(isoDate) {
  if (!isoDate) return "";
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** "8:00 AM" - from a time-only "HH:mm" or "HH:mm:ss" string. */
export function formatTime(time) {
  if (!time) return "";
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** "₱1,500.00" */
export function formatPeso(amount) {
  if (amount === null || amount === undefined) return "";
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);
}
