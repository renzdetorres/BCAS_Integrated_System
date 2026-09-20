import { useState } from "react";
import { useSession } from "../../context/SessionContext.jsx";
import Sidebar from "./Sidebar.jsx";
import TopBar from "./TopBar.jsx";
import "./AppLayout.css";

/** Persistent shell (sidebar + topbar) every authenticated page renders inside. */
export default function AppLayout({ title, actions, children }) {
  const { session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar role={session.role} isOpen={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      {sidebarOpen ? (
        <div className="app-layout-scrim" onClick={() => setSidebarOpen(false)} />
      ) : null}
      <div className="app-layout-body">
        <TopBar onMenuClick={() => setSidebarOpen((open) => !open)} />
        <main className="app-layout-content">
          {title ? (
            <div className="app-layout-header">
              <h1>{title}</h1>
              {actions ? <div className="app-layout-actions">{actions}</div> : null}
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
