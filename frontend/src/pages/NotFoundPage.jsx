import { Link, Navigate } from "react-router-dom";
import { useSession } from "../context/SessionContext.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import BootScreen from "../components/BootScreen.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";

/** Any address that matches no page: signed-out visitors go to sign in, signed-in ones see where to go next. */
export default function NotFoundPage() {
  const { session, isLoading } = useSession();

  if (isLoading) return <BootScreen />;
  if (!session) return <Navigate to="/login" replace />;

  return (
    <AppLayout title="Page not found">
      <EmptyState
        icon="search"
        title="We can't find that page"
        message="The link may be old or mistyped. Use the menu, or go back to your dashboard."
        action={<Link to="/portal">Go to dashboard</Link>}
      />
    </AppLayout>
  );
}
