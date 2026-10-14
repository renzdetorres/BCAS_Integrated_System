import { ACADEMIC_CATEGORIES, SEMESTERS, SENIOR_HIGH_STRANDS, TERMS } from "./academicStructure.js";
import { DEPARTMENT_PROGRAMS } from "./departments.js";
import { API_BASE_URL } from "../api/apiClient.js";

/** Replaces an array's contents without replacing the array, so every module holding a reference sees the change. */
function replaceInPlace(target, next) {
  if (Array.isArray(next) && next.length > 0) target.splice(0, target.length, ...next);
}

/**
 * Applies the lists the school has saved in Settings (strands, terms,
 * semesters, year levels, College programs) to the config modules the forms,
 * filters and reports already read from. The built-in lists stay in place
 * until this runs, and when the server can't be reached.
 */
export function applyAcademicCatalog(catalog) {
  if (!catalog) return;

  replaceInPlace(SENIOR_HIGH_STRANDS, catalog.strands);
  replaceInPlace(TERMS, catalog.terms);
  replaceInPlace(SEMESTERS, catalog.semesters);

  for (const category of ACADEMIC_CATEGORIES) {
    replaceInPlace(category.yearLevels, catalog.yearLevels?.[category.value]);
  }

  if (Array.isArray(catalog.programs) && catalog.programs.length > 0) {
    DEPARTMENT_PROGRAMS.College = catalog.programs.map(({ code, name }) => ({ code, name }));
  }
}

/** Fetches the saved lists and applies them. Never throws: a failure just keeps the built-in lists. */
export async function loadAcademicCatalog() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/academic-catalog`, { method: "GET", credentials: "include" });
    if (!response.ok) return null;
    const catalog = await response.json();
    applyAcademicCatalog(catalog);
    return catalog;
  } catch {
    return null;
  }
}
