import * as api from "../api/academicHeadAnnouncementsApi.js";
import AnnouncementsManager from "../components/AnnouncementsManager.jsx";

export default function AcademicHeadAnnouncementsPage() {
  return (
    <AnnouncementsManager
      api={api}
      subtitle="Admission and scholarship news for applicants, managed with the Admin-Registrar. New announcements start as drafts until posted."
    />
  );
}
