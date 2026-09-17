import { Link } from "react-router-dom";
import { useSession } from "../context/SessionContext.jsx";
import { useLogout } from "../hooks/useLogout.js";
import "./PortalPage.css";

const PORTAL_LABELS = {
  Evaluator: "Evaluator Portal",
  SupportStaff: "Support Staff Portal",
  AcademicHead: "Academic Head Portal",
  Admin: "Admin-Registrar Portal",
};

export default function PortalPage() {
  const { session } = useSession();
  const handleLogout = useLogout();

  // RequireAuth guarantees session is set before this renders. Applicant
  // has its own dashboard (see App.jsx) - this generic view covers staff
  // roles, which don't have a dedicated portal yet.
  const portalLabel = PORTAL_LABELS[session.role] ?? "Portal";

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
