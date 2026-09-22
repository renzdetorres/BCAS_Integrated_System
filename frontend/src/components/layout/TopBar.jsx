import { useState } from "react";
import { Link } from "react-router-dom";
import { useSession } from "../../context/SessionContext.jsx";
import { useLogout } from "../../hooks/useLogout.js";
import { PROFILE_MENU_BY_ROLE } from "../../config/navigation.js";
import Icon from "../ui/Icon.jsx";
import "./TopBar.css";

function initials(firstName, lastName) {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
}

export default function TopBar({ onMenuClick }) {
  const { session } = useSession();
  const handleLogout = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);
  const profileMenuItems = PROFILE_MENU_BY_ROLE[session.role] ?? [];

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
            {profileMenuItems.map((item) => (
              <Link key={item.to} to={item.to} className="topbar-menu-item">
                <Icon name={item.icon} size={16} />
                {item.label}
              </Link>
            ))}
            {profileMenuItems.length > 0 ? <div className="topbar-menu-divider" /> : null}
            <button type="button" className="topbar-menu-item topbar-menu-item-danger" onClick={handleLogout}>
              <Icon name="logout" size={16} />
              Log Out
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
