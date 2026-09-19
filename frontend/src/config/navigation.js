import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Megaphone,
  ListChecks,
  Settings,
  ClipboardList,
  Award,
  BarChart3,
  Layers,
  Users,
  ShieldCheck,
  FileSearch,
} from "lucide-react";

// Nav config per role for the shared AppShell/Sidebar. `badgeKey` looks up a
// count from the `badges` object passed into AppShell (e.g. { applications: 4 }) -
// items without a matching key just render with no badge.
export const PORTAL_NAV = {
  Applicant: {
    subtitle: "STUDENT PORTAL",
    rolePill: "Applicant",
    items: [
      { label: "Overview", to: "/portal", icon: LayoutDashboard },
      { label: "My Application", to: "/app/my-application", icon: FileText },
      { label: "Documents", to: "/documents", icon: FolderOpen, badgeKey: "documents" },
      { label: "Announcements", to: "/announcements", icon: Megaphone },
      { label: "Application Status", to: "/application-tracking", icon: ListChecks },
      { label: "Settings", to: "/settings", icon: Settings },
    ],
  },
  Admin: {
    subtitle: "REGISTRAR",
    rolePill: "Registrar",
    items: [
      { label: "Overview", to: "/portal", icon: LayoutDashboard },
      { label: "Applications", to: "/admin/applications", icon: ClipboardList, badgeKey: "applications" },
      { label: "Scholarships", to: "/admin/scholarship-applications", icon: Award },
      { label: "Documents", to: "/admin/documents", icon: FolderOpen, badgeKey: "documents" },
      { label: "Announcements", to: "/announcements", icon: Megaphone },
      { label: "Reports", to: "/admin/reports", icon: BarChart3 },
      { label: "Slot Management", to: "/admin/scholarships", icon: Layers },
      { label: "Account Management", to: "/admin/users", icon: Users },
      { label: "Settings", to: "/settings", icon: Settings },
    ],
  },
  Evaluator: {
    subtitle: "SCHOLARSHIP OFFICE",
    rolePill: "Evaluator",
    items: [
      { label: "Overview", to: "/portal", icon: LayoutDashboard },
      { label: "Screening", to: "/evaluator/screening", icon: ShieldCheck, badgeKey: "screening" },
      { label: "Scholarship Apps", to: "/evaluator/scholarship-applications", icon: FileText },
      { label: "Scholarship Slots", to: "/evaluator/scholarship-slots", icon: Layers },
      { label: "Settings", to: "/settings", icon: Settings },
    ],
  },
  SupportStaff: {
    subtitle: "SUPPORT STAFF",
    rolePill: "Support Staff",
    items: [
      { label: "Overview", to: "/portal", icon: LayoutDashboard },
      { label: "Document Verification", to: "/support-staff/documents", icon: FileSearch, badgeKey: "documents" },
      { label: "Applications", to: "/support-staff/applicants", icon: ClipboardList },
      { label: "Settings", to: "/settings", icon: Settings },
    ],
  },
};
