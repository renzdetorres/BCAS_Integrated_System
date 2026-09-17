import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "../context/SessionContext.jsx";

export default function RequireAuth() {
  const { session, isLoading } = useSession();

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}>
        Loading...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
