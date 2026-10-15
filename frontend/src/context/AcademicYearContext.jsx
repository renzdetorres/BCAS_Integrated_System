import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getAdmissionConfig } from "../api/schoolConfigApi.js";
import { useSession } from "./SessionContext.jsx";

const STORAGE_KEY = "bcas.admin.academicYear";

const AcademicYearContext = createContext(undefined);

/** Philippine school years start in June, so Jan-May still belongs to the year that began last June. */
function calendarAcademicYearStart(now = new Date()) {
  return now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
}

/** The five academic years the filter offers, newest first: the school's current year and the four before it. */
export function lastFiveAcademicYears(currentStart) {
  return Array.from({ length: 5 }, (_, i) => `${currentStart - i}-${currentStart - i + 1}`);
}

function readStored() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeStored(value) {
  try {
    if (value) window.localStorage.setItem(STORAGE_KEY, value);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // A private window or blocked storage just means the choice isn't remembered.
  }
}

/**
 * The Admin's chosen academic year ("" = all years), shared by the top bar's
 * filter and the dashboard figures. It is one of the last five academic years,
 * counted from the school's current year in Settings, and is remembered in this browser.
 */
export function AcademicYearProvider({ children }) {
  const { session } = useSession();
  const isAdmin = session?.role === "Admin";
  const [currentStart, setCurrentStart] = useState(calendarAcademicYearStart());
  const [selected, setSelected] = useState(readStored);

  useEffect(() => {
    if (!isAdmin) return undefined;
    let cancelled = false;
    getAdmissionConfig()
      .then((config) => {
        const start = Number.parseInt(String(config.academicYear).slice(0, 4), 10);
        if (!cancelled && Number.isFinite(start)) setCurrentStart(start);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const years = useMemo(() => lastFiveAcademicYears(currentStart), [currentStart]);

  // A remembered year that has since fallen out of the five-year window is dropped.
  const academicYear = years.includes(selected) ? selected : "";

  const setAcademicYear = useCallback((value) => {
    setSelected(value);
    writeStored(value);
  }, []);

  const value = useMemo(() => ({ academicYear, setAcademicYear, years }), [academicYear, setAcademicYear, years]);

  return <AcademicYearContext.Provider value={value}>{children}</AcademicYearContext.Provider>;
}

export function useAcademicYear() {
  const context = useContext(AcademicYearContext);
  if (!context) throw new Error("useAcademicYear must be used within an AcademicYearProvider");
  return context;
}
