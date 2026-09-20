import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { SessionProvider } from "./context/SessionContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
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
import ScholarshipScreeningPage from "./pages/ScholarshipScreeningPage.jsx";
import ScholarshipSlotsPage from "./pages/ScholarshipSlotsPage.jsx";
import EvaluatorSettingsPage from "./pages/EvaluatorSettingsPage.jsx";
import AcademicHeadReviewPage from "./pages/AcademicHeadReviewPage.jsx";
import AcademicHeadScholarshipsPage from "./pages/AcademicHeadScholarshipsPage.jsx";
import AcademicHeadAnnouncementsPage from "./pages/AcademicHeadAnnouncementsPage.jsx";
import AcademicHeadReportsPage from "./pages/AcademicHeadReportsPage.jsx";
import AcademicHeadSettingsPage from "./pages/AcademicHeadSettingsPage.jsx";
import SupportStaffDocumentsPage from "./pages/SupportStaffDocumentsPage.jsx";
import SupportStaffApplicantsPage from "./pages/SupportStaffApplicantsPage.jsx";
import SupportStaffSettingsPage from "./pages/SupportStaffSettingsPage.jsx";
import SupportStaffDocumentArchivePage from "./pages/SupportStaffDocumentArchivePage.jsx";
import AdminApplicationsPage from "./pages/AdminApplicationsPage.jsx";
import AdminApplicationDetailPage from "./pages/AdminApplicationDetailPage.jsx";
import AdminDocumentsPage from "./pages/AdminDocumentsPage.jsx";
import AdminArchivePage from "./pages/AdminArchivePage.jsx";
import AdminAnnouncementsPage from "./pages/AdminAnnouncementsPage.jsx";
import AdminReportsPage from "./pages/AdminReportsPage.jsx";
import ScholarshipContractPage from "./pages/ScholarshipContractPage.jsx";
import AdminExamSchedulesPage from "./pages/AdminExamSchedulesPage.jsx";
import AdminExamPermitsPage from "./pages/AdminExamPermitsPage.jsx";
import AdminScholarshipsPage from "./pages/AdminScholarshipsPage.jsx";
import AdminReservationsPage from "./pages/AdminReservationsPage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <ToastProvider>
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
                <Route path="/admin/applications" element={<AdminApplicationsPage />} />
                <Route path="/admin/applications/:applicationId" element={<AdminApplicationDetailPage />} />
                <Route path="/admin/documents" element={<AdminDocumentsPage />} />
                <Route path="/admin/archive" element={<AdminArchivePage />} />
                <Route path="/admin/announcements" element={<AdminAnnouncementsPage />} />
                <Route path="/admin/reports" element={<AdminReportsPage />} />
                <Route path="/admin/reports/scholarship/:applicationId/contract" element={<ScholarshipContractPage />} />
                <Route path="/admin/exam-schedules" element={<AdminExamSchedulesPage />} />
                <Route path="/admin/exam-permits" element={<AdminExamPermitsPage />} />
                <Route path="/admin/scholarships" element={<AdminScholarshipsPage />} />
                <Route path="/admin/reservations" element={<AdminReservationsPage />} />
              </Route>
              <Route element={<RequireRole allowedRoles={["Evaluator"]} />}>
                <Route
                  path="/evaluator/scholarship-applications/:applicationId"
                  element={<ScholarshipScreeningPage />}
                />
                <Route path="/evaluator/scholarship-slots" element={<ScholarshipSlotsPage />} />
                <Route path="/evaluator/settings" element={<EvaluatorSettingsPage />} />
              </Route>
              <Route element={<RequireRole allowedRoles={["AcademicHead"]} />}>
                <Route
                  path="/academic-head/scholarship-applications/:applicationId"
                  element={<AcademicHeadReviewPage />}
                />
                <Route path="/academic-head/scholarships" element={<AcademicHeadScholarshipsPage />} />
                <Route path="/academic-head/announcements" element={<AcademicHeadAnnouncementsPage />} />
                <Route path="/academic-head/reports" element={<AcademicHeadReportsPage />} />
                <Route path="/academic-head/settings" element={<AcademicHeadSettingsPage />} />
              </Route>
              <Route element={<RequireRole allowedRoles={["SupportStaff"]} />}>
                <Route path="/support-staff/documents" element={<SupportStaffDocumentsPage />} />
                <Route path="/support-staff/documents/archive" element={<SupportStaffDocumentArchivePage />} />
                <Route path="/support-staff/applicants" element={<SupportStaffApplicantsPage />} />
                <Route path="/support-staff/settings" element={<SupportStaffSettingsPage />} />
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
        </ToastProvider>
      </SessionProvider>
    </BrowserRouter>
  );
}
