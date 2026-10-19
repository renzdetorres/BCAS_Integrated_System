// What a person can look for on the staff Settings pages (Support Staff, Evaluator,
// Academic Head). `id` is the DOM id SettingsSearch jumps to.

export const STAFF_ACCOUNT_ENTRIES = [
  { id: "settings-profile", label: "Profile", group: "Account", hint: "Update your name and email", keywords: "account details personal information" },
  { id: "firstName", label: "First name", group: "Profile", keywords: "given name" },
  { id: "lastName", label: "Last name", group: "Profile", keywords: "surname family name" },
  { id: "email", label: "Email", group: "Profile", hint: "The address sign-in and notifications use", keywords: "e-mail address contact" },
  { id: "settings-password", label: "Change password", group: "Security", hint: "Enter your current password and choose a new one", keywords: "reset security sign in login" },
  { id: "currentPassword", label: "Current password", group: "Change password", keywords: "old password" },
  { id: "newPassword", label: "New password", group: "Change password", hint: "At least 8 characters" },
  { id: "confirmNewPassword", label: "Confirm new password", group: "Change password", keywords: "re-enter repeat retype" },
];

export const ACADEMIC_HEAD_DEPARTMENT_ENTRY = {
  id: "settings-department",
  label: "Assigned department",
  group: "Profile",
  hint: "Only an Admin-Registrar can change this",
  keywords: "department assigned program scope",
};

/** Applicant settings: tabs and their fields. `tab` tells the page what to reveal first. */
export const APPLICANT_SETTINGS_ENTRIES = [
  { id: "settings-password", tab: "password", label: "Change password", group: "Account", hint: "Enter your current password and choose a new one", keywords: "reset security sign in login" },
  { id: "currentPassword", tab: "password", label: "Current password", group: "Change password", keywords: "old password" },
  { id: "newPassword", tab: "password", label: "New password", group: "Change password", hint: "At least 8 characters" },
  { id: "confirmNewPassword", tab: "password", label: "Confirm new password", group: "Change password", keywords: "re-enter repeat retype" },
  { id: "settings-notifications", tab: "notifications", label: "Notification preferences", group: "Preferences", hint: "Choose which updates are emailed to you", keywords: "email alerts updates turn off on" },
];

/** Admin System Settings: the page's own sections and the admission fields worth finding quickly. */
export const ADMIN_SETTINGS_ENTRIES = [
  { id: "settings-system", label: "System settings", group: "Admissions and scholarships", hint: "System-level on/off settings", keywords: "toggle enable disable" },
  { id: "settings-admission", label: "Admission settings", group: "Section", hint: "Academic year, age rule, exam scoring and payment", keywords: "school config" },
  { id: "Admission.AcademicYear", label: "Academic year applications are filed for", group: "Admission settings", keywords: "school year 2026-2027 calendar june" },
  { id: "AgePolicy.PreKinderMinAge", label: "Pre-Kinder minimum age", group: "Admission settings", keywords: "age policy" },
  { id: "AgePolicy.KinderMinAge", label: "Kindergarten minimum age", group: "Admission settings", keywords: "age policy kinder" },
  { id: "AgePolicy.CutoffMonth", label: "Age is counted until the end of", group: "Admission settings", keywords: "cutoff month age policy" },
  { id: "Exam.TotalItems", label: "Items on the exam", group: "Entrance exam scoring", keywords: "total items questions" },
  { id: "Exam.PassingScore", label: "Passing raw score", group: "Entrance exam scoring", keywords: "pass mark passing grade" },
  { id: "Exam.MaxRetakes", label: "Retakes allowed", group: "Entrance exam scoring", keywords: "retake max attempts" },
  { id: "Payment.ExamFee", label: "Exam fee (PHP)", group: "Entrance exam payment", keywords: "price amount cost peso" },
  { id: "Payment.AccountName", label: "Account name shown to applicants", group: "Entrance exam payment", keywords: "payment gcash bank" },
  { id: "Payment.Instructions", label: "Payment instructions", group: "Entrance exam payment", keywords: "how to pay" },
  { id: "settings-qr", label: "QR payment code", group: "Entrance exam payment", hint: "PNG or JPG, under 1 MB", keywords: "upload replace image gcash" },
  { id: "settings-catalog", label: "Academic structure", group: "Section", hint: "Year levels, terms, semesters, strands and College programs", keywords: "catalog grade levels strands programs bsit" },
  { id: "settings-email", label: "Email", group: "Section", hint: "Whether the system can send email, and a test message", keywords: "smtp gmail send test notification" },
  { id: "settings-semesters", label: "Semesters", group: "Section", hint: "Scholarships are locked while a semester is in progress", keywords: "dates term start end add remove" },
];
