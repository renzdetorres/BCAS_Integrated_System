import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "../context/SessionContext.jsx";

// Used nested under RequireAuth, which guarantees session is already set.
export default function RequireRole({ allowedRoles }) {
  const { session } = useSession();

  if (!allowedRoles.includes(session.role)) {
    return <Navigate to="/portal" replace />;
  }

  return <Outlet />;
}
