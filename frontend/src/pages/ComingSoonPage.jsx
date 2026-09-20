import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";

// Placeholder destination for roles that have no backend endpoint for this
// feature yet (e.g. Announcements for Evaluator/Support Staff).
export default function ComingSoonPage({ title }) {
  return (
    <AppLayout title={title}>
      <Card>
        <p>This section is coming soon.</p>
      </Card>
    </AppLayout>
  );
}
