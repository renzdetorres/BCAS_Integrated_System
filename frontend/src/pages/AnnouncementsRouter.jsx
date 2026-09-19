import { useSession } from "../context/SessionContext.jsx";
import AnnouncementsPage from "./AnnouncementsPage.jsx";
import AdminAnnouncementsPage from "./AdminAnnouncementsPage.jsx";
import ComingSoonPage from "./ComingSoonPage.jsx";

// RequireAuth guarantees session is set before this renders. Applicant gets
// the real read-only announcements list; Admin gets the management view;
// every other role keeps seeing the placeholder until they have their own
// view built.
export default function AnnouncementsRouter() {
  const { session } = useSession();
  if (session.role === "Applicant") return <AnnouncementsPage />;
  if (session.role === "Admin") return <AdminAnnouncementsPage />;
  return <ComingSoonPage title="Announcements" />;
}
