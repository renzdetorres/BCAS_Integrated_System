import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { SessionProvider } from "./context/SessionContext.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import RequireRole from "./components/RequireRole.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import PortalPage from "./pages/PortalPage.jsx";
import ProvisionStaffPage from "./pages/ProvisionStaffPage.jsx";
import ManageUsersPage from "./pages/ManageUsersPage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/portal" element={<PortalPage />} />
            <Route element={<RequireRole allowedRoles={["Admin"]} />}>
              <Route path="/admin/staff" element={<ProvisionStaffPage />} />
              <Route path="/admin/users" element={<ManageUsersPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </SessionProvider>
    </BrowserRouter>
  );
}
