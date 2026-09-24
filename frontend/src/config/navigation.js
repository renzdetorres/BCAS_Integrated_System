// Sidebar nav per role, grouped by actual area of work (not alphabetically),
// built strictly from routes already registered in App.jsx. Groups exist only
// where a role has enough distinct areas to benefit from them - a 3-item role
// stays flat rather than forcing an artificial section.
export const NAV_ITEMS_BY_ROLE = {
  Applicant: [
    {
      section: null,
      items: [{ to: "/portal", label: "Dashboard", icon: "home", end: true }],
    },
    {
      section: "My Application",
      items: [
        { to: "/applications", label: "Admission Application", icon: "doc" },
        { to: "/applications/history", label: "Application History", icon: "history" },
        { to: "/application-tracking", label: "Application Tracking", icon: "track" },
        { to: "/documents", label: "Documents", icon: "folder" },
      ],
    },
    {
      section: "Scholarship",
      items: [{ to: "/scholarships", label: "Scholarship Application", icon: "award" }],
    },
    {
      section: "Entrance Exam",
      items: [
        { to: "/exam-schedule", label: "Exam Schedule", icon: "calendar" },
        { to: "/exam-permit", label: "Exam Permit", icon: "ticket" },
      ],
    },
    {
      section: null,
      items: [
        { to: "/announcements", label: "Announcements", icon: "bell" },
        { to: "/inquiries", label: "Inquiries", icon: "message" },
      ],
    },
  ],
  Admin: [
    {
      section: null,
      items: [{ to: "/portal", label: "Dashboard", icon: "home", end: true }],
    },
    {
      section: "Admissions",
      items: [
        { to: "/admin/applications", label: "Applications", icon: "doc" },
        { to: "/admin/documents", label: "Document Verification Log", icon: "folder" },
        { to: "/admin/exam-schedules", label: "Exam Schedules", icon: "calendar" },
        { to: "/admin/exam-permits", label: "Exam Permits", icon: "ticket" },
        { to: "/admin/reservations", label: "Reservations", icon: "bookmark" },
        { to: "/admin/archive", label: "Records Archive", icon: "archive" },
      ],
    },
    {
      section: "Scholarships",
      items: [{ to: "/admin/scholarships", label: "Scholarships", icon: "award" }],
    },
    {
      section: "Communications",
      items: [
        { to: "/admin/announcements", label: "Announcements", icon: "bell" },
        { to: "/staff/inquiries", label: "Inquiries", icon: "message" },
      ],
    },
    {
      section: "Reports",
      items: [{ to: "/admin/reports", label: "Reports", icon: "chart" }],
    },
    {
      section: "Administration",
      items: [
        { to: "/admin/users", label: "Account Management", icon: "users" },
        { to: "/admin/duplicate-applicants", label: "Duplicate Applicants", icon: "copy" },
        { to: "/admin/staff", label: "Provision Staff", icon: "user-plus" },
        { to: "/admin/audit-logs", label: "Activity Log", icon: "history" },
      ],
    },
  ],
  Evaluator: [
    {
      section: null,
      items: [
        { to: "/portal", label: "Dashboard", icon: "home", end: true },
        { to: "/evaluator/scholarship-slots", label: "Scholarship Slots", icon: "award" },
      ],
    },
  ],
  AcademicHead: [
    {
      section: null,
      items: [{ to: "/portal", label: "Dashboard", icon: "home", end: true }],
    },
    {
      section: "Scholarship Oversight",
      items: [
        { to: "/academic-head/scholarships", label: "Scholarships", icon: "award" },
        { to: "/academic-head/announcements", label: "Announcements", icon: "bell" },
        { to: "/academic-head/reports", label: "Reports", icon: "chart" },
      ],
    },
  ],
  SupportStaff: [
    {
      section: null,
      items: [{ to: "/portal", label: "Dashboard", icon: "home", end: true }],
    },
    {
      section: "Document Verification",
      items: [
        { to: "/support-staff/documents", label: "Verification Queue", icon: "folder" },
        { to: "/support-staff/documents/archive", label: "Document Archive", icon: "archive" },
      ],
    },
    {
      section: null,
      items: [
        { to: "/support-staff/applicants", label: "Applicant Records", icon: "users" },
        { to: "/staff/inquiries", label: "Inquiries", icon: "message" },
      ],
    },
  ],
};

// The profile dropdown's own menu (TopBar), separate from primary sidebar
// nav - account-level settings live here for every role instead of
// competing for space with the actual work the sidebar is for.
export const PROFILE_MENU_BY_ROLE = {
  Applicant: [{ to: "/profile", label: "Settings", icon: "settings" }],
  Admin: [
    { to: "/admin/notification-settings", label: "Notification Settings", icon: "mail" },
    { to: "/admin/settings", label: "System Settings", icon: "settings" },
  ],
  Evaluator: [{ to: "/evaluator/settings", label: "Settings", icon: "settings" }],
  AcademicHead: [{ to: "/academic-head/settings", label: "Settings", icon: "settings" }],
  SupportStaff: [{ to: "/support-staff/settings", label: "Settings", icon: "settings" }],
};

export const ROLE_LABELS = {
  Applicant: "Applicant Portal",
  Admin: "Admin / Registrar Portal",
  Evaluator: "Evaluator Portal",
  AcademicHead: "Academic Head Portal",
  SupportStaff: "Support Staff Portal",
};

// Same roles, without "Portal" - for compact spots like the TopBar's role
// tag where the sidebar's fuller label would wrap or crowd the user menu.
export const ROLE_SHORT_LABELS = {
  Applicant: "Applicant",
  Admin: "Admin / Registrar",
  Evaluator: "Evaluator",
  AcademicHead: "Academic Head",
  SupportStaff: "Support Staff",
};
