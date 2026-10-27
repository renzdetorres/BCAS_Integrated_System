import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { SessionProvider } from "./context/SessionContext.jsx";
import { AcademicYearProvider } from "./context/AcademicYearContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import RequireRole from "./components/RequireRole.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import AdminRoleAccessPage from "./pages/AdminRoleAccessPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import PortalRouter from "./pages/PortalRouter.jsx";
import PaymentPage from "./pages/PaymentPage.jsx";
import StaffPaymentsPage from "./pages/StaffPaymentsPage.jsx";
import ExamResultPage from "./pages/ExamResultPage.jsx";
import InterviewPage from "./pages/InterviewPage.jsx";
import ExamResultsPage from "./pages/ExamResultsPage.jsx";
import InterviewsPage from "./pages/InterviewsPage.jsx";
import ScholarshipPipelinePage from "./pages/ScholarshipPipelinePage.jsx";
import ManageUsersPage from "./pages/ManageUsersPage.jsx";
import NotificationSettingsPage from "./pages/NotificationSettingsPage.jsx";
import AdminSettingsPage from "./pages/AdminSettingsPage.jsx";
import AnnouncementsRouter from "./pages/AnnouncementsRouter.jsx";
import ApplicantProfilePage from "./pages/ApplicantProfilePage.jsx";
import ApplicantSettingsPage from "./pages/ApplicantSettingsPage.jsx";
import AdmissionApplicationPage from "./pages/AdmissionApplicationPage.jsx";
import ScholarshipApplicationPage from "./pages/ScholarshipApplicationPage.jsx";
import MyApplicationHistoryPage from "./pages/MyApplicationHistoryPage.jsx";
import EvaluatorDashboardPage from "./pages/EvaluatorDashboardPage.jsx";
import AdminAdmissionSlotsPage from "./pages/AdminAdmissionSlotsPage.jsx";
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
import AdminRecordsPage from "./pages/AdminRecordsPage.jsx";
import AdminAnnouncementsPage from "./pages/AdminAnnouncementsPage.jsx";
import AdminReportsPage from "./pages/AdminReportsPage.jsx";
import AdminAnalyticsPage from "./pages/AdminAnalyticsPage.jsx";
import ScholarshipContractPage from "./pages/ScholarshipContractPage.jsx";
import AdminExamSchedulesPage from "./pages/AdminExamSchedulesPage.jsx";
import AdminExamPermitsPage from "./pages/AdminExamPermitsPage.jsx";
import AdminScholarshipsPage from "./pages/AdminScholarshipsPage.jsx";
import AdminReservationsPage from "./pages/AdminReservationsPage.jsx";
import AdminAuditLogsPage from "./pages/AdminAuditLogsPage.jsx";
import InquiriesPage from "./pages/InquiriesPage.jsx";
import InquiryDetailPage from "./pages/InquiryDetailPage.jsx";
import StaffInquiriesPage from "./pages/StaffInquiriesPage.jsx";
import StaffInquiryDetailPage from "./pages/StaffInquiryDetailPage.jsx";

/** The Documents page now lives inside My Application; old links and bookmarks land there, keeping any upload notice. */
function DocumentsRedirect() {
  const { state } = useLocation();
  return <Navigate to="/application-tracking" replace state={state} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <AcademicYearProvider>
        <ToastProvider>
          <Routes>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route element={<RequireAuth />}>
              <Route path="/portal" element={<PortalRouter />} />
              <Route path="/announcements" element={<AnnouncementsRouter />} />
              <Route element={<RequireRole allowedRoles={["Admin"]} />}>
                <Route path="/admin/staff" element={<Navigate to="/admin/users?new=1" replace />} />
                <Route path="/admin/users" element={<ManageUsersPage />} />
                <Route path="/admin/notification-settings" element={<NotificationSettingsPage />} />
                <Route path="/admin/settings" element={<AdminSettingsPage />} />
                <Route path="/admin/applications" element={<AdminApplicationsPage />} />
                <Route path="/admin/applications/:applicationId" element={<AdminApplicationDetailPage />} />
                <Route path="/admin/documents" element={<AdminDocumentsPage />} />
                <Route path="/admin/document-verification" element={<SupportStaffDocumentsPage />} />
                <Route path="/admin/document-archive" element={<SupportStaffDocumentArchivePage />} />
                <Route path="/admin/applicant-records" element={<SupportStaffApplicantsPage />} />
                <Route path="/admin/admission-slots" element={<AdminAdmissionSlotsPage />} />
                <Route path="/admin/scholarship-slots" element={<ScholarshipSlotsPage />} />
                <Route path="/admin/scholarship-screening" element={<EvaluatorDashboardPage />} />
                <Route path="/admin/scholarship-applications/:applicationId" element={<ScholarshipScreeningPage />} />
                <Route path="/admin/records" element={<AdminRecordsPage />} />
                <Route path="/admin/archive" element={<AdminArchivePage />} />
                <Route path="/admin/announcements" element={<AdminAnnouncementsPage />} />
                <Route path="/admin/reports" element={<AdminReportsPage />} />
                <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
                <Route path="/admin/reports/scholarship/:applicationId/contract" element={<ScholarshipContractPage />} />
                <Route path="/admin/payments" element={<StaffPaymentsPage />} />
                <Route path="/admin/scholarship-pipeline" element={<ScholarshipPipelinePage />} />
                <Route path="/admin/exam-results" element={<ExamResultsPage />} />
                <Route path="/admin/interviews" element={<InterviewsPage />} />
                <Route path="/admin/exam-schedules" element={<AdminExamSchedulesPage />} />
                <Route path="/admin/exam-permits" element={<AdminExamPermitsPage />} />
                <Route path="/admin/scholarships" element={<AdminScholarshipsPage />} />
                <Route path="/admin/reservations" element={<AdminReservationsPage />} />
                <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} />
                <Route path="/admin/access" element={<AdminRoleAccessPage />} />
              </Route>
              <Route element={<RequireRole allowedRoles={["Evaluator"]} />}>
                <Route
                  path="/evaluator/scholarship-applications/:applicationId"
                  element={<ScholarshipScreeningPage />}
                />
                <Route path="/evaluator/scholarship-slots" element={<ScholarshipSlotsPage />} />
                <Route path="/evaluator/scholarship-pipeline" element={<ScholarshipPipelinePage />} />
                <Route path="/evaluator/applications" element={<AdminApplicationsPage />} />
                <Route path="/evaluator/applications/:applicationId" element={<AdminApplicationDetailPage />} />
                <Route path="/evaluator/documents" element={<SupportStaffDocumentsPage />} />
                <Route path="/evaluator/documents/archive" element={<SupportStaffDocumentArchivePage />} />
                <Route path="/evaluator/exam-permits" element={<AdminExamPermitsPage />} />
                <Route path="/evaluator/exam-results" element={<ExamResultsPage />} />
                <Route path="/evaluator/interviews" element={<InterviewsPage />} />
                <Route path="/evaluator/settings" element={<EvaluatorSettingsPage />} />
              </Route>
              <Route element={<RequireRole allowedRoles={["AcademicHead"]} />}>
                <Route
                  path="/academic-head/scholarship-applications/:applicationId"
                  element={<AcademicHeadReviewPage />}
                />
                <Route path="/academic-head/scholarships" element={<AcademicHeadScholarshipsPage />} />
                <Route path="/academic-head/scholarship-pipeline" element={<ScholarshipPipelinePage />} />
                <Route path="/academic-head/announcements" element={<AcademicHeadAnnouncementsPage />} />
                <Route path="/academic-head/reports" element={<AcademicHeadReportsPage />} />
                <Route path="/academic-head/settings" element={<AcademicHeadSettingsPage />} />
              </Route>
              <Route element={<RequireRole allowedRoles={["SupportStaff"]} />}>
                <Route path="/support-staff/payments" element={<StaffPaymentsPage />} />
                <Route path="/support-staff/exam-results" element={<ExamResultsPage />} />
                <Route path="/support-staff/applicants" element={<SupportStaffApplicantsPage />} />
                <Route path="/support-staff/settings" element={<SupportStaffSettingsPage />} />
              </Route>
              <Route element={<RequireRole allowedRoles={["Applicant"]} />}>
                <Route path="/profile" element={<ApplicantProfilePage />} />
                <Route path="/settings" element={<ApplicantSettingsPage />} />
                <Route path="/applications" element={<AdmissionApplicationPage />} />
                <Route path="/applications/history" element={<MyApplicationHistoryPage />} />
                <Route path="/applications/receipt/:applicationId" element={<ApplicationReceiptPage />} />
                <Route path="/scholarships" element={<ScholarshipApplicationPage />} />
                <Route path="/documents" element={<DocumentsRedirect />} />
                <Route path="/payment" element={<PaymentPage />} />
                <Route path="/exam-result" element={<ExamResultPage />} />
                <Route path="/interview" element={<InterviewPage />} />
                <Route path="/exam-schedule" element={<ExamSchedulePage />} />
                <Route path="/exam-permit" element={<ExamPermitPage />} />
                <Route path="/application-tracking" element={<ApplicationTrackingPage />} />
                <Route path="/inquiries" element={<InquiriesPage />} />
                <Route path="/inquiries/:threadId" element={<InquiryDetailPage />} />
              </Route>
              <Route element={<RequireRole allowedRoles={["SupportStaff", "Admin"]} />}>
                <Route path="/staff/inquiries" element={<StaffInquiriesPage />} />
                <Route path="/staff/inquiries/:threadId" element={<StaffInquiryDetailPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </ToastProvider>
        </AcademicYearProvider>
      </SessionProvider>
    </BrowserRouter>
  );
}
