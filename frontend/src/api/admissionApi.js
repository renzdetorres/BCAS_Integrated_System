import { API_BASE_URL, ApiError, resolveErrorMessage } from "./apiClient.js";

export const APPLICATION_TYPES = [
  { value: "NewStudent", label: "New Student" },
  { value: "Transferee", label: "Transferee" },
];

export async function getMyAdmissionApplications() {
  const response = await fetch(`${API_BASE_URL}/api/admission-applications`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(resolveErrorMessage(response, null, "Failed to load applications."), response.status);
  }

  return response.json();
}

const text = (value) => (value ?? "").trim();
const member = (m) => ({ name: text(m.name), occupation: text(m.occupation), phone: text(m.phone) });

/** The page's flat form state, as the API's request (the entrance-exam fields go under "form"). */
function toRequest(f) {
  return {
    applicationType: f.applicationType,
    department: f.department,
    courseAppliedFor: text(f.courseAppliedFor),
    previousSchool: text(f.previousSchool),
    form: {
      sex: f.sex,
      placeOfBirth: text(f.placeOfBirth),
      previousSchoolAddress: text(f.previousSchoolAddress),
      specialSkills: text(f.specialSkills),
      father: member(f.father),
      mother: member(f.mother),
      guardian: member(f.guardian),
      siblings: f.siblings.map((s) => ({
        name: text(s.name),
        age: s.age === "" || s.age === null ? null : Number(s.age),
        occupation: text(s.occupation),
        schoolOrWork: text(s.schoolOrWork),
      })),
      studentSignature: text(f.studentSignature),
      guardianSignature: text(f.guardianSignature),
    },
  };
}

export async function submitAdmissionApplication(formState) {
  const response = await fetch(`${API_BASE_URL}/api/admission-applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(toRequest(formState)),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = resolveErrorMessage(response, data, "Failed to submit application. Please try again.");
    throw new ApiError(message, response.status);
  }

  return data;
}
