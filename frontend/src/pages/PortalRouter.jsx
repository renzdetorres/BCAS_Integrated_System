import { useSession } from "../context/SessionContext.jsx";
import ApplicantDashboardPage from "./ApplicantDashboardPage.jsx";
import AdminDashboardPage from "./AdminDashboardPage.jsx";
import EvaluatorDashboardPage from "./EvaluatorDashboardPage.jsx";
import PortalPage from "./PortalPage.jsx";

// RequireAuth guarantees session is set before this renders. Applicant gets
// its own dashboard (BISAASS-14), Admin gets its own analytics dashboard
// (BISAASS-27), Evaluator gets its own queue/evaluations dashboard
// (BISAASS-41); every other staff role lands on the generic staff portal
// until they have a dedicated one built.
export default function PortalRouter() {
  const { session } = useSession();
  if (session.role === "Applicant") return <ApplicantDashboardPage />;
  if (session.role === "Admin") return <AdminDashboardPage />;
  if (session.role === "Evaluator") return <EvaluatorDashboardPage />;
  return <PortalPage />;
}
