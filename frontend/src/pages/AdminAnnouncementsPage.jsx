import * as api from "../api/adminAnnouncementsApi.js";
import AnnouncementsManager from "../components/AnnouncementsManager.jsx";

export default function AdminAnnouncementsPage() {
  return (
    <AnnouncementsManager
      api={api}
      subtitle="Admission and scholarship news for applicants. New announcements start as drafts; post one to make it visible, and deactivate it to hide it again without deleting it."
    />
  );
}
