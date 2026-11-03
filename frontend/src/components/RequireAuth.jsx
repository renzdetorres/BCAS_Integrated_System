import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isPathBlocked } from "../config/access.js";
import AppLayout from "./layout/AppLayout.jsx";
import BootScreen from "./BootScreen.jsx";
import EmptyState from "./ui/EmptyState.jsx";
import SessionWarning from "./SessionWarning.jsx";
import { useSession } from "../context/SessionContext.jsx";

export default function RequireAuth() {
  const { session, isLoading, blockedFeatures } = useSession();
  const location = useLocation();

  if (isLoading) {
    return <BootScreen />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (isPathBlocked(session.role, location.pathname, blockedFeatures)) {
    return (
      <AppLayout title="Access restricted">
        <EmptyState
          title="This page is not available to your role"
          icon="lock"
          message="An Admin has switched this page off for your role. Ask them if you need access."
        />
      </AppLayout>
    );
  }

  return (
    <>
      <Outlet />
      <SessionWarning />
    </>
  );
}
