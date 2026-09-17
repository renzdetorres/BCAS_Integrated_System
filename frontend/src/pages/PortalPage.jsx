import { Link, useNavigate } from "react-router-dom";
import { logoutUser } from "../api/authApi.js";
import { useSession } from "../context/SessionContext.jsx";
import "./PortalPage.css";

const PORTAL_LABELS = {
  Applicant: "Applicant Portal",
  Evaluator: "Evaluator Portal",
  SupportStaff: "Support Staff Portal",
  AcademicHead: "Academic Head Portal",
  Admin: "Admin-Registrar Portal",
};

export default function PortalPage() {
  const { session, setSession } = useSession();
  const navigate = useNavigate();

  // RequireAuth guarantees session is set before this renders.
  const portalLabel = PORTAL_LABELS[session.role] ?? "Portal";

  async function handleLogout() {
    try {
      await logoutUser();
    } finally {
      setSession(null);
      navigate("/login", { replace: true });
    }
  }

  return (
    <main className="portal-page">
      <div className="portal-card">
        <span className="portal-badge">{session.role}</span>
        <h1>{portalLabel}</h1>
        <p>
          Signed in as <strong>{session.email}</strong>.
        </p>
        {session.role === "Admin" && (
          <>
            <Link className="portal-admin-link" to="/admin/staff">
              Create Staff Account
            </Link>
            <Link className="portal-admin-link" to="/admin/users">
              Manage Accounts
            </Link>
          </>
        )}
        <button type="button" onClick={handleLogout}>
          Log Out
        </button>
      </div>
    </main>
  );
}
