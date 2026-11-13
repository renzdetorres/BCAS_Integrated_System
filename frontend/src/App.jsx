import { Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { SessionProvider } from "./context/SessionContext.jsx";
import { AcademicYearProvider } from "./context/AcademicYearContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import { AppearanceProvider } from "./context/AppearanceContext.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import RequireRole from "./components/RequireRole.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import { lazyPage } from "./utils/lazyPage.js";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import BootScreen from "./components/BootScreen.jsx";
import RouteProgress from "./components/RouteProgress.jsx";

// Each page is its own file, fetched when its route is first opened, so sign-in and the
// first screen load only what they need.
const NotFoundPage = lazyPage(() => import("./pages/NotFoundPage.jsx"));
const AppearancePage = lazyPage(() => import("./pages/AppearancePage.jsx"));
const RegisterPage = lazyPage(() => import("./pages/RegisterPage.jsx"));
const ForgotPasswordPage = lazyPage(() => import("./pages/ForgotPasswordPage.jsx"));
const AdminRoleAccessPage = lazyPage(() => import("./pages/AdminRoleAccessPage.jsx"));
const ResetPasswordPage = lazyPage(() => import("./pages/ResetPasswordPage.jsx"));
const PortalRouter = lazyPage(() => import("./pages/PortalRouter.jsx"));
const PaymentPage = lazyPage(() => import("./pages/PaymentPage.jsx"));
const StaffPaymentsPage = lazyPage(() => import("./pages/StaffPaymentsPage.jsx"));
const ExamResultPage = lazyPage(() => import("./pages/ExamResultPage.jsx"));
const InterviewPage = lazyPage(() => import("./pages/InterviewPage.jsx"));
const ExamResultsPage = lazyPage(() => import("./pages/ExamResultsPage.jsx"));
const InterviewsPage = lazyPage(() => import("./pages/InterviewsPage.jsx"));
const ScholarshipPipelinePage = lazyPage(() => import("./pages/ScholarshipPipelinePage.jsx"));
const ManageUsersPage = lazyPage(() => import("./pages/ManageUsersPage.jsx"));
const NotificationSettingsPage = lazyPage(() => import("./pages/NotificationSettingsPage.jsx"));
const AdminSettingsPage = lazyPage(() => import("./pages/AdminSettingsPage.jsx"));
const AnnouncementsRouter = lazyPage(() => import("./pages/AnnouncementsRouter.jsx"));
const ApplicantProfilePage = lazyPage(() => import("./pages/ApplicantProfilePage.jsx"));
const ApplicantSettingsPage = lazyPage(() => import("./pages/ApplicantSettingsPage.jsx"));
const AdmissionApplicationPage = lazyPage(() => import("./pages/AdmissionApplicationPage.jsx"));
const ScholarshipApplicationPage = lazyPage(() => import("./pages/ScholarshipApplicationPage.jsx"));
const MyApplicationHistoryPage = lazyPage(() => import("./pages/MyApplicationHistoryPage.jsx"));
const EvaluatorDashboardPage = lazyPage(() => import("./pages/EvaluatorDashboardPage.jsx"));
const AdminAdmissionSlotsPage = lazyPage(() => import("./pages/AdminAdmissionSlotsPage.jsx"));
const ExamSchedulePage = lazyPage(() => import("./pages/ExamSchedulePage.jsx"));
const ExamPermitPage = lazyPage(() => import("./pages/ExamPermitPage.jsx"));
const ApplicationTrackingPage = lazyPage(() => import("./pages/ApplicationTrackingPage.jsx"));
const ApplicationReceiptPage = lazyPage(() => import("./pages/ApplicationReceiptPage.jsx"));
const ScholarshipScreeningPage = lazyPage(() => import("./pages/ScholarshipScreeningPage.jsx"));
const ScholarshipSlotsPage = lazyPage(() => import("./pages/ScholarshipSlotsPage.jsx"));
const EvaluatorSettingsPage = lazyPage(() => import("./pages/EvaluatorSettingsPage.jsx"));
const AcademicHeadReviewPage = lazyPage(() => import("./pages/AcademicHeadReviewPage.jsx"));
const AcademicHeadScholarshipsPage = lazyPage(() => import("./pages/AcademicHeadScholarshipsPage.jsx"));
const AcademicHeadAnnouncementsPage = lazyPage(() => import("./pages/AcademicHeadAnnouncementsPage.jsx"));
const AcademicHeadReportsPage = lazyPage(() => import("./pages/AcademicHeadReportsPage.jsx"));
const AcademicHeadSettingsPage = lazyPage(() => import("./pages/AcademicHeadSettingsPage.jsx"));
const SupportStaffDocumentsPage = lazyPage(() => import("./pages/SupportStaffDocumentsPage.jsx"));
const SupportStaffApplicantsPage = lazyPage(() => import("./pages/SupportStaffApplicantsPage.jsx"));
const SupportStaffSettingsPage = lazyPage(() => import("./pages/SupportStaffSettingsPage.jsx"));
const SupportStaffDocumentArchivePage = lazyPage(() => import("./pages/SupportStaffDocumentArchivePage.jsx"));
const AdminApplicationsPage = lazyPage(() => import("./pages/AdminApplicationsPage.jsx"));
const AdminApplicationDetailPage = lazyPage(() => import("./pages/AdminApplicationDetailPage.jsx"));
const AdminDocumentsPage = lazyPage(() => import("./pages/AdminDocumentsPage.jsx"));
const AdminArchivePage = lazyPage(() => import("./pages/AdminArchivePage.jsx"));
const AdminRecordsPage = lazyPage(() => import("./pages/AdminRecordsPage.jsx"));
const AdminAnnouncementsPage = lazyPage(() => import("./pages/AdminAnnouncementsPage.jsx"));
const AdminReportsPage = lazyPage(() => import("./pages/AdminReportsPage.jsx"));
const AdminAnalyticsPage = lazyPage(() => import("./pages/AdminAnalyticsPage.jsx"));
const ScholarshipContractPage = lazyPage(() => import("./pages/ScholarshipContractPage.jsx"));
const AdminExamSchedulesPage = lazyPage(() => import("./pages/AdminExamSchedulesPage.jsx"));
const AdminExamPermitsPage = lazyPage(() => import("./pages/AdminExamPermitsPage.jsx"));
const AdminScholarshipsPage = lazyPage(() => import("./pages/AdminScholarshipsPage.jsx"));
const AdminReservationsPage = lazyPage(() => import("./pages/AdminReservationsPage.jsx"));
const AdminAuditLogsPage = lazyPage(() => import("./pages/AdminAuditLogsPage.jsx"));
const InquiriesPage = lazyPage(() => import("./pages/InquiriesPage.jsx"));
const InquiryDetailPage = lazyPage(() => import("./pages/InquiryDetailPage.jsx"));
const StaffInquiriesPage = lazyPage(() => import("./pages/StaffInquiriesPage.jsx"));
const StaffInquiryDetailPage = lazyPage(() => import("./pages/StaffInquiryDetailPage.jsx"));

/** The Documents page now lives inside My Application; old links and bookmarks land there, keeping any upload notice. */
function DocumentsRedirect() {
  const { state } = useLocation();
  return <Navigate to="/application-tracking" replace state={state} />;
}

export default function App() {
  return (
    // startTransition keeps the current page on screen while the next page's file loads,
    // instead of flashing the loading screen on every first visit to a page.
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppearanceProvider>
      <SessionProvider>
        <AcademicYearProvider>
        <ToastProvider>
          <RouteProgress />
          <ErrorBoundary>
          <Suspense fallback={<BootScreen />}>
          <Routes>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route element={<RequireAuth />}>
              <Route path="/portal" element={<PortalRouter />} />
              <Route path="/announcements" element={<AnnouncementsRouter />} />
              <Route path="/appearance" element={<AppearancePage />} />
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
                <Route path="/evaluator/scholarship-screening" element={<EvaluatorDashboardPage />} />
                <Route path="/evaluator/scholarship-slots" element={<ScholarshipSlotsPage />} />
                <Route path="/evaluator/scholarship-pipeline" element={<ScholarshipPipelinePage />} />
                <Route path="/evaluator/applications" element={<AdminApplicationsPage />} />
                <Route path="/evaluator/applications/:applicationId" element={<AdminApplicationDetailPage />} />
                <Route path="/evaluator/documents" element={<SupportStaffDocumentsPage />} />
                <Route path="/evaluator/documents/archive" element={<SupportStaffDocumentArchivePage />} />
                <Route path="/evaluator/exam-results" element={<ExamResultsPage />} />
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
                <Route path="/support-staff/exam-permits" element={<AdminExamPermitsPage />} />
                <Route path="/support-staff/exam-results" element={<ExamResultsPage />} />
                <Route path="/support-staff/interviews" element={<InterviewsPage />} />
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
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </Suspense>
          </ErrorBoundary>
        </ToastProvider>
        </AcademicYearProvider>
      </SessionProvider>
      </AppearanceProvider>
    </BrowserRouter>
  );
}
