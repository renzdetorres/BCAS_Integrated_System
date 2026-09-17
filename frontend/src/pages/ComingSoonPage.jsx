import { Link } from "react-router-dom";
import "./ComingSoonPage.css";

// Placeholder destination for dashboard quick links whose full pages
// (My Application, Documents, Announcements) are separate, not-yet-built tickets.
export default function ComingSoonPage({ title }) {
  return (
    <main className="coming-soon-page">
      <div className="coming-soon-card">
        <Link className="coming-soon-back-link" to="/portal">
          &larr; Back to dashboard
        </Link>
        <h1>{title}</h1>
        <p>This section is coming soon.</p>
      </div>
    </main>
  );
}
