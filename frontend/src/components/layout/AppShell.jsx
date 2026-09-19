import { useState } from "react";
import Sidebar from "./Sidebar.jsx";
import TopBar from "./TopBar.jsx";
import { PORTAL_NAV } from "../../config/navigation.js";
import { useSession } from "../../context/SessionContext.jsx";

const FALLBACK_NAV = { subtitle: "PORTAL", rolePill: "Staff", items: [] };

export default function AppShell({ children, badges = {}, notificationCount = 0 }) {
  const { session } = useSession();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const nav = PORTAL_NAV[session?.role] ?? FALLBACK_NAV;

  return (
    <div className="flex min-h-screen bg-page">
      <Sidebar
        subtitle={nav.subtitle}
        items={nav.items}
        badges={badges}
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          rolePill={nav.rolePill}
          notificationCount={notificationCount}
          session={session}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
