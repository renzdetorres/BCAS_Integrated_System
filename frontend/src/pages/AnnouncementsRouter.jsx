import { useSession } from "../context/SessionContext.jsx";
import AnnouncementsPage from "./AnnouncementsPage.jsx";
import ComingSoonPage from "./ComingSoonPage.jsx";

// RequireAuth guarantees session is set before this renders. Applicant gets
// the real announcements list (BISAASS-23); every other role keeps seeing
// the placeholder until they have their own view built.
export default function AnnouncementsRouter() {
  const { session } = useSession();
  return session.role === "Applicant" ? <AnnouncementsPage /> : <ComingSoonPage title="Announcements" />;
}
