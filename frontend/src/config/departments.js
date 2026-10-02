// The departments an applicant applies into and an Academic Head is
// assigned to. Both sides pick from this one list so an Academic Head's
// scope is an exact match - mirrored server-side by DepartmentConstants.cs,
// which is what actually enforces it.
export const DEPARTMENT_OPTIONS = ["College", "Senior High School", "High School", "Elementary"];

// Departments that offer a fixed set of programs. An admission application
// to one of these names one of its programs, stored by code. A department
// not listed here takes its strand or grade level as typed. Mirrored by
// DepartmentConstants.FixedPrograms on the server, which enforces it.
export const DEPARTMENT_PROGRAMS = {
  College: [
    { code: "BSBA", name: "Bachelor of Science in Business Administration" },
    { code: "BSED", name: "Bachelor of Science in Education" },
    { code: "BSA", name: "Bachelor of Science in Accountancy" },
    { code: "BSIT", name: "Bachelor of Science in Information Technology" },
  ],
};

/** The fixed program list for a department, or null if it takes free text. */
export function programsFor(department) {
  return DEPARTMENT_PROGRAMS[department] ?? null;
}

/** "BSIT - Bachelor of Science in Information Technology", for dropdowns. */
export function programOptionLabel(program) {
  return `${program.code} - ${program.name}`;
}
