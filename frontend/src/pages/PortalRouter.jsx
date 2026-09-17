import { useSession } from "../context/SessionContext.jsx";
import ApplicantDashboardPage from "./ApplicantDashboardPage.jsx";
import PortalPage from "./PortalPage.jsx";

// RequireAuth guarantees session is set before this renders. Applicant gets
// its own dashboard (BISAASS-14); every other role lands on the generic
// staff portal until they have a dedicated one built.
export default function PortalRouter() {
  const { session } = useSession();
  return session.role === "Applicant" ? <ApplicantDashboardPage /> : <PortalPage />;
}
