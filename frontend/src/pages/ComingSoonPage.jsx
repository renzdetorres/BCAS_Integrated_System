import AppShell from "../components/layout/AppShell.jsx";
import Card from "../components/ui/Card.jsx";

// Placeholder destination for nav/quick links whose full pages are
// separate, not-yet-built tickets, or not offered for the signed-in role.
export default function ComingSoonPage({ title }) {
  return (
    <AppShell>
      <Card>
        <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">This section is coming soon.</p>
      </Card>
    </AppShell>
  );
}
