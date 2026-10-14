// The shape of each academic category an applicant picks from: its year
// levels, whether a strand applies, and what the term choice is called.
// Mirrored server-side by AcademicStructure.cs, which is what enforces it.

export const SENIOR_HIGH_STRANDS = ["STEM", "ABM", "HUMSS", "GAS", "TVL"];
export const TERMS = ["1st Term", "2nd Term", "3rd Term"];
export const SEMESTERS = ["1st Semester", "2nd Semester", "Summer"];

export const PRE_KINDER = "Pre-Kinder";
export const KINDERGARTEN = "Kindergarten";

export const ACADEMIC_CATEGORIES = [
  {
    value: "Elementary",
    label: "Elementary",
    blurb: "Pre-Kinder to Grade 6",
    yearLevelLabel: "Grade level",
    yearLevels: [PRE_KINDER, KINDERGARTEN, "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6"],
    terms: null,
    hasStrand: false,
  },
  {
    value: "High School",
    label: "High School",
    blurb: "Grade 7 to Grade 10",
    yearLevelLabel: "Grade level",
    yearLevels: ["Grade 7", "Grade 8", "Grade 9", "Grade 10"],
    terms: TERMS,
    termLabel: "Academic path",
    hasStrand: false,
  },
  {
    value: "Senior High School",
    label: "Senior High School",
    blurb: "Grade 11 and Grade 12",
    yearLevelLabel: "Grade level",
    yearLevels: ["Grade 11", "Grade 12"],
    terms: TERMS,
    termLabel: "Academic path",
    hasStrand: true,
  },
  {
    value: "College",
    label: "College",
    blurb: "Degree programs",
    yearLevelLabel: "Year level",
    yearLevels: ["1st Year", "2nd Year", "3rd Year", "4th Year"],
    terms: SEMESTERS,
    termLabel: "Semester",
    hasStrand: false,
  },
];

export function categoryFor(value) {
  return ACADEMIC_CATEGORIES.find((c) => c.value === value) ?? null;
}

/**
 * Age on the last day of `cutoffMonth` in `cutoffYear`, for the Pre-Kinder /
 * Kindergarten check: the child must have reached the minimum age by then,
 * not simply be that age on the day they apply. Mirrors AcademicStructure.ValidateAge.
 */
export function ageAtCutoff(birthDate, cutoffMonth, cutoffYear) {
  const [year, month, day] = birthDate.split("-").map(Number);
  const lastDay = new Date(cutoffYear, cutoffMonth, 0).getDate();
  let age = cutoffYear - year;
  if (cutoffMonth < month || (cutoffMonth === month && lastDay < day)) age -= 1;
  return age;
}

/** A message when the applicant is too young for Pre-Kinder or Kindergarten, otherwise null. */
export function ageProblem(yearLevel, birthDate, config) {
  if (!birthDate || !config) return null;
  const minAge = yearLevel === PRE_KINDER ? config.preKinderMinAge : yearLevel === KINDERGARTEN ? config.kinderMinAge : null;
  if (minAge == null) return null;

  const age = ageAtCutoff(birthDate, config.ageCutoffMonth, config.ageCutoffYear);
  if (age >= minAge) return null;

  const monthName = new Date(2000, config.ageCutoffMonth - 1, 1).toLocaleString("en", { month: "long" });
  return `${yearLevel} applicants must be at least ${minAge} years old by the end of ${monthName} ${config.ageCutoffYear}. The applicant will be ${Math.max(age, 0)} by then.`;
}
