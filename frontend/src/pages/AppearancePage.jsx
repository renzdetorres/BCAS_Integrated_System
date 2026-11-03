import AppLayout from "../components/layout/AppLayout.jsx";
import AppearanceSettings from "../components/AppearanceSettings.jsx";
import "./ApplicantProfilePage.css";

/**
 * Appearance and layout for every role that has no Profile page of its own. Applicants reach the
 * same controls on their Profile; staff open this from the account menu.
 */
export default function AppearancePage() {
  return (
    <AppLayout title="Appearance">
      <div className="settings-layout">
        <div className="settings-content">
          <AppearanceSettings />
        </div>
      </div>
    </AppLayout>
  );
}
