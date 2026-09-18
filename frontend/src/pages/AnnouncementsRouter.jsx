import { useSession } from "../context/SessionContext.jsx";
import AnnouncementsPage from "./AnnouncementsPage.jsx";
import AdminAnnouncementsPage from "./AdminAnnouncementsPage.jsx";
import ComingSoonPage from "./ComingSoonPage.jsx";

// RequireAuth guarantees session is set before this renders. Applicant gets
// the real announcements list (BISAASS-23); Admin-Registrar gets the
// create/post/deactivate management view (BISAASS-36); every other role
// keeps seeing the placeholder until they have their own view built.
export default function AnnouncementsRouter() {
  const { session } = useSession();
  if (session.role === "Applicant") return <AnnouncementsPage />;
  if (session.role === "Admin") return <AdminAnnouncementsPage />;
  return <ComingSoonPage title="Announcements" />;
}
