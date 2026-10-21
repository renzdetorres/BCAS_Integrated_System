import { cleanPhoneInput } from "./phone.js";

/** A submitted admission application, flattened back into the shape the application form edits and the summary reads. */
export function formFromApplication(application) {
  const f = application.form ?? {};
  const member = (m) => ({ name: m?.name ?? "", occupation: m?.occupation ?? "", phone: cleanPhoneInput(m?.phone) });
  return {
    applicationType: application.applicationType,
    department: application.department ?? "",
    courseAppliedFor: application.courseAppliedFor,
    yearLevel: f.yearLevel ?? "",
    academicTerm: f.academicTerm ?? "",
    previousSchool: application.previousSchool,
    previousSchoolAddress: f.previousSchoolAddress ?? "",
    sex: f.sex ?? "",
    placeOfBirth: f.placeOfBirth ?? "",
    specialSkills: f.specialSkills ?? "",
    father: member(f.father),
    mother: member(f.mother),
    motherMaidenName: f.motherMaidenName ?? "",
    guardian: member(f.guardian),
    studentSignature: f.studentSignature ?? "",
    guardianSignature: f.guardianSignature ?? "",
  };
}
