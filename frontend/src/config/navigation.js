// Sidebar nav per role, built strictly from the routes already registered in
// App.jsx / already reachable today (each role's dashboard already links to
// every one of these). No destination here is invented.
export const NAV_ITEMS_BY_ROLE = {
  Applicant: [
    { to: "/portal", label: "Dashboard", icon: "home", end: true },
    { to: "/applications", label: "My Application", icon: "doc" },
    { to: "/applications/history", label: "Application History", icon: "history" },
    { to: "/application-tracking", label: "Application Tracking", icon: "track" },
    { to: "/scholarships", label: "Scholarship Application", icon: "award" },
    { to: "/documents", label: "Documents", icon: "folder" },
    { to: "/exam-schedule", label: "Exam Schedule", icon: "calendar" },
    { to: "/exam-permit", label: "Exam Permit", icon: "ticket" },
    { to: "/announcements", label: "Announcements", icon: "bell" },
    { to: "/profile", label: "Settings", icon: "settings" },
  ],
  Admin: [
    { to: "/portal", label: "Dashboard", icon: "home", end: true },
    { to: "/admin/applications", label: "Applications", icon: "doc" },
    { to: "/admin/documents", label: "Document Verification", icon: "folder" },
    { to: "/admin/archive", label: "Records Archive", icon: "archive" },
    { to: "/admin/reservations", label: "Reservations", icon: "bookmark" },
    { to: "/admin/exam-schedules", label: "Exam Schedules", icon: "calendar" },
    { to: "/admin/exam-permits", label: "Exam Permits", icon: "ticket" },
    { to: "/admin/scholarships", label: "Scholarships", icon: "award" },
    { to: "/admin/announcements", label: "Announcements", icon: "bell" },
    { to: "/admin/reports", label: "Reports", icon: "chart" },
    { to: "/admin/users", label: "Account Management", icon: "users" },
    { to: "/admin/staff", label: "Provision Staff", icon: "user-plus" },
    { to: "/admin/notification-settings", label: "Notification Settings", icon: "mail" },
    { to: "/admin/settings", label: "System Settings", icon: "settings" },
  ],
  Evaluator: [
    { to: "/portal", label: "Dashboard", icon: "home", end: true },
    { to: "/evaluator/scholarship-slots", label: "Scholarship Slots", icon: "award" },
    { to: "/evaluator/settings", label: "Settings", icon: "settings" },
  ],
  AcademicHead: [
    { to: "/portal", label: "Dashboard", icon: "home", end: true },
    { to: "/academic-head/scholarships", label: "Scholarships", icon: "award" },
    { to: "/academic-head/announcements", label: "Announcements", icon: "bell" },
    { to: "/academic-head/reports", label: "Reports", icon: "chart" },
    { to: "/academic-head/settings", label: "Settings", icon: "settings" },
  ],
  SupportStaff: [
    { to: "/portal", label: "Dashboard", icon: "home", end: true },
    { to: "/support-staff/documents", label: "Document Verification", icon: "folder" },
    { to: "/support-staff/documents/archive", label: "Document Archive", icon: "archive" },
    { to: "/support-staff/applicants", label: "Applicant Records", icon: "users" },
    { to: "/support-staff/settings", label: "Settings", icon: "settings" },
  ],
};

export const ROLE_LABELS = {
  Applicant: "Applicant Portal",
  Admin: "Admin / Registrar Portal",
  Evaluator: "Evaluator Portal",
  AcademicHead: "Academic Head Portal",
  SupportStaff: "Support Staff Portal",
};
