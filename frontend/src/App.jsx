import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { SessionProvider } from "./context/SessionContext.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import RequireRole from "./components/RequireRole.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import PortalRouter from "./pages/PortalRouter.jsx";
import ProvisionStaffPage from "./pages/ProvisionStaffPage.jsx";
import ManageUsersPage from "./pages/ManageUsersPage.jsx";
import ComingSoonPage from "./pages/ComingSoonPage.jsx";
import ApplicantProfilePage from "./pages/ApplicantProfilePage.jsx";
import AdmissionApplicationPage from "./pages/AdmissionApplicationPage.jsx";
import ScholarshipApplicationPage from "./pages/ScholarshipApplicationPage.jsx";
import MyApplicationHistoryPage from "./pages/MyApplicationHistoryPage.jsx";
import DocumentsPage from "./pages/DocumentsPage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/portal" element={<PortalRouter />} />
            <Route path="/announcements" element={<ComingSoonPage title="Announcements" />} />
            <Route element={<RequireRole allowedRoles={["Admin"]} />}>
              <Route path="/admin/staff" element={<ProvisionStaffPage />} />
              <Route path="/admin/users" element={<ManageUsersPage />} />
            </Route>
            <Route element={<RequireRole allowedRoles={["Applicant"]} />}>
              <Route path="/profile" element={<ApplicantProfilePage />} />
              <Route path="/applications" element={<AdmissionApplicationPage />} />
              <Route path="/applications/history" element={<MyApplicationHistoryPage />} />
              <Route path="/scholarships" element={<ScholarshipApplicationPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </SessionProvider>
    </BrowserRouter>
  );
}
