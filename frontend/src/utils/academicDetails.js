import { categoryFor } from "../config/academicStructure.js";
import { programOptionLabel, programsFor } from "../config/departments.js";

/**
 * What an admission application is for, as label/value pairs ready to show:
 * the academic category, the program (College) or strand (Senior High School),
 * the year level, the term / semester / academic path, and the academic year.
 * Rows with no value are left out, so an older application that never recorded
 * a level simply shows fewer rows.
 *
 * `source` takes the fields wherever they live: department, courseAppliedFor,
 * yearLevel, academicTerm, academicYear (a flat list item), or the same under `form`.
 */
export function academicDetails(source) {
  const form = source.form ?? {};
  const department = source.department ?? null;
  const course = source.courseAppliedFor ?? null;
  const yearLevel = source.yearLevel ?? form.yearLevel ?? null;
  const term = source.academicTerm ?? form.academicTerm ?? null;
  const academicYear = source.academicYear ?? form.academicYear ?? null;
  const category = categoryFor(department);

  // College names a program (stored by code); Senior High School names a strand.
  const programs = programsFor(department);
  const program = programs?.find((p) => p.code === course);
  const programOrStrand =
    department === "College" ? (program ? programOptionLabel(program) : course) : category?.hasStrand ? course : null;

  const rows = [
    ["Academic category", department],
    [department === "College" ? "Program" : "Strand", programOrStrand],
    [category?.yearLevelLabel ?? "Level", yearLevel ?? (department === "Elementary" || department === "High School" ? course : null)],
    [category?.termLabel ?? "Term", term],
    ["Academic year", academicYear],
  ];

  return rows.filter(([, value]) => value);
}

/** The same details on one line, for tight spaces: "College · BSIT · 1st Year · 1st Semester". */
export function academicSummary(source) {
  return academicDetails(source)
    .filter(([label]) => label !== "Academic year")
    .map(([, value]) => value)
    .join(" · ");
}
