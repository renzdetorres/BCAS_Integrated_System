import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { SessionProvider } from "./context/SessionContext.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import RequireRole from "./components/RequireRole.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import PortalRouter from "./pages/PortalRouter.jsx";
import ProvisionStaffPage from "./pages/ProvisionStaffPage.jsx";
import ManageUsersPage from "./pages/ManageUsersPage.jsx";
import NotificationSettingsPage from "./pages/NotificationSettingsPage.jsx";
import AdminSettingsPage from "./pages/AdminSettingsPage.jsx";
import AnnouncementsRouter from "./pages/AnnouncementsRouter.jsx";
import ApplicantProfilePage from "./pages/ApplicantProfilePage.jsx";
import AdmissionApplicationPage from "./pages/AdmissionApplicationPage.jsx";
import ScholarshipApplicationPage from "./pages/ScholarshipApplicationPage.jsx";
import MyApplicationHistoryPage from "./pages/MyApplicationHistoryPage.jsx";
import DocumentsPage from "./pages/DocumentsPage.jsx";
import ExamSchedulePage from "./pages/ExamSchedulePage.jsx";
import ExamPermitPage from "./pages/ExamPermitPage.jsx";
import ApplicationTrackingPage from "./pages/ApplicationTrackingPage.jsx";
import ApplicationReceiptPage from "./pages/ApplicationReceiptPage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/portal" element={<PortalRouter />} />
            <Route path="/announcements" element={<AnnouncementsRouter />} />
            <Route element={<RequireRole allowedRoles={["Admin"]} />}>
              <Route path="/admin/staff" element={<ProvisionStaffPage />} />
              <Route path="/admin/users" element={<ManageUsersPage />} />
              <Route path="/admin/notification-settings" element={<NotificationSettingsPage />} />
              <Route path="/admin/settings" element={<AdminSettingsPage />} />
            </Route>
            <Route element={<RequireRole allowedRoles={["Applicant"]} />}>
              <Route path="/profile" element={<ApplicantProfilePage />} />
              <Route path="/applications" element={<AdmissionApplicationPage />} />
              <Route path="/applications/history" element={<MyApplicationHistoryPage />} />
              <Route path="/applications/receipt/:applicationId" element={<ApplicationReceiptPage />} />
              <Route path="/scholarships" element={<ScholarshipApplicationPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/exam-schedule" element={<ExamSchedulePage />} />
              <Route path="/exam-permit" element={<ExamPermitPage />} />
              <Route path="/application-tracking" element={<ApplicationTrackingPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </SessionProvider>
    </BrowserRouter>
  );
}
