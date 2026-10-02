import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "../context/SessionContext.jsx";

export default function RequireAuth() {
  const { session, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="app-boot" role="status">
        <span className="app-boot-spinner" aria-hidden="true" />
        Loading your workspace...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
