import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSession } from "../../context/SessionContext.jsx";
import { useLogout } from "../../hooks/useLogout.js";
import { getActiveAnnouncements } from "../../api/announcementApi.js";
import { ROLE_SHORT_LABELS } from "../../config/navigation.js";
import Icon from "../ui/Icon.jsx";
import "./TopBar.css";

function initials(firstName, lastName) {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
}

function formatDate(isoDateTime) {
  return new Date(isoDateTime).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Closes an open panel on an outside click, without swallowing the click
    that opened it (the ref is attached to the whole trigger+panel wrapper). */
function useOutsideClick(onOutside) {
  const ref = useRef(null);
  useEffect(() => {
    function handleClick(event) {
      if (ref.current && !ref.current.contains(event.target)) onOutside();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onOutside]);
  return ref;
}

export default function TopBar({ onMenuClick }) {
  const { session } = useSession();
  const handleLogout = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const userRef = useOutsideClick(() => setMenuOpen(false));
  const notifRef = useOutsideClick(() => setNotifOpen(false));

  useEffect(() => {
    getActiveAnnouncements()
      .then(setAnnouncements)
      .catch(() => setAnnouncements([]));
  }, []);

  const recent = announcements.slice(0, 5);

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

      <div className="topbar-notif" ref={notifRef}>
        <button
          type="button"
          className="topbar-icon-button"
          onClick={() => setNotifOpen((open) => !open)}
          aria-label="Announcements"
        >
          <Icon name="bell" size={19} />
          {announcements.length > 0 ? (
            <span className="topbar-notif-badge">{announcements.length > 9 ? "9+" : announcements.length}</span>
          ) : null}
        </button>

        {notifOpen ? (
          <div className="topbar-panel topbar-notif-panel">
            <div className="topbar-panel-header">Announcements</div>
            {recent.length === 0 ? (
              <p className="topbar-notif-empty">No active announcements right now.</p>
            ) : (
              <ul className="topbar-notif-list">
                {recent.map((announcement) => (
                  <li key={announcement.announcementId}>
                    <span className="topbar-notif-title">{announcement.title}</span>
                    <span className="topbar-notif-meta">
                      {announcement.category} &middot; {formatDate(announcement.postedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link className="topbar-panel-footer" to="/announcements" onClick={() => setNotifOpen(false)}>
              View all announcements
            </Link>
          </div>
        ) : null}
      </div>

      <div className="topbar-user" ref={userRef}>
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
            <span className="topbar-user-role">{ROLE_SHORT_LABELS[session.role] ?? session.role}</span>
          </span>
          <Icon name="chevron" size={16} />
        </button>

        {menuOpen ? (
          <div className="topbar-panel topbar-menu">
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
