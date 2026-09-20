import { useState } from "react";
import { useSession } from "../../context/SessionContext.jsx";
import { useLogout } from "../../hooks/useLogout.js";
import Icon from "../ui/Icon.jsx";
import "./TopBar.css";

function initials(firstName, lastName) {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
}

export default function TopBar({ onMenuClick }) {
  const { session } = useSession();
  const handleLogout = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="topbar">
      <button
        type="button"
        className="topbar-menu-button"
        onClick={onMenuClick}
        aria-label="Toggle navigation"
      >
        <Icon name="menu" size={20} />
      </button>

      <div className="topbar-spacer" />

      <span className="topbar-role-pill">{session.role}</span>

      <div className="topbar-user">
        <button
          type="button"
          className="topbar-user-button"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="topbar-avatar">{initials(session.firstName, session.lastName)}</span>
          <span className="topbar-user-text">
            <span className="topbar-user-name">
              {session.firstName} {session.lastName}
            </span>
            <span className="topbar-user-role">{session.role}</span>
          </span>
          <Icon name="chevron" size={16} />
        </button>

        {menuOpen ? (
          <div className="topbar-menu">
            <button type="button" className="topbar-menu-item" onClick={handleLogout}>
              <Icon name="logout" size={16} />
              Log Out
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
