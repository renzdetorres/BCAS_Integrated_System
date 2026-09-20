import { useSession } from "../context/SessionContext.jsx";
import AnnouncementsPage from "./AnnouncementsPage.jsx";
import AdminAnnouncementsPage from "./AdminAnnouncementsPage.jsx";
import AcademicHeadAnnouncementsPage from "./AcademicHeadAnnouncementsPage.jsx";
import ComingSoonPage from "./ComingSoonPage.jsx";

// RequireAuth guarantees session is set before this renders. Applicant gets
// the real announcements list (BISAASS-23); Admin-Registrar gets the
// create/post/deactivate management view (BISAASS-36); Academic Head gets
// its own conditionally-authorized management view (BISAASS-48); Evaluator
// and Support Staff have no announcements endpoint of their own yet, so they
// keep seeing the placeholder.
export default function AnnouncementsRouter() {
  const { session } = useSession();
  if (session.role === "Applicant") return <AnnouncementsPage />;
  if (session.role === "Admin") return <AdminAnnouncementsPage />;
  if (session.role === "AcademicHead") return <AcademicHeadAnnouncementsPage />;
  return <ComingSoonPage title="Announcements" />;
}
