import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { SessionProvider } from "./context/SessionContext.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import PortalPage from "./pages/PortalPage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/portal" element={<PortalPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </SessionProvider>
    </BrowserRouter>
  );
}
