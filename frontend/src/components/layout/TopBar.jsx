import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSession } from "../../context/SessionContext.jsx";
import { useLogout } from "../../hooks/useLogout.js";
import { getActiveAnnouncements } from "../../api/announcementApi.js";
import { PROFILE_MENU_BY_ROLE, ROLE_SHORT_LABELS } from "../../config/navigation.js";
import { searchApplications } from "../../api/adminApplicationsApi.js";
import Icon from "../ui/Icon.jsx";
import SearchSuggest, { buildSuggestions } from "../ui/SearchSuggest.jsx";
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

/**
 * Admin-only: searches applicants by name or email by opening the
 * Applications list with that search already applied - the list page owns
 * the actual query, so there's one search behaviour, not two.
 */
function ApplicationSearch() {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");

  const [suggestions, setSuggestions] = useState([]);

  // Predictive: after a short pause in typing, ask the same endpoint the list
  // page uses and offer the matching applicant names and emails.
  useEffect(() => {
    const query = term.trim();
    if (query.length < 2) {
      setSuggestions([]);
      return undefined;
    }
    let cancelled = false;
    const timeout = setTimeout(() => {
      searchApplications({ search: query })
        .then((applications) => {
          if (cancelled) return;
          const values = applications.flatMap((application) => [application.applicantName, application.applicantEmail]);
          setSuggestions(buildSuggestions(values, query));
        })
        .catch(() => {
          if (!cancelled) setSuggestions([]);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [term]);

  function go(value) {
    const query = value.trim();
    navigate(query ? `/admin/applications?${new URLSearchParams({ search: query })}` : "/admin/applications");
  }

  function handleSubmit(event) {
    event.preventDefault();
    go(term);
  }

  return (
    <form className="topbar-search" role="search" onSubmit={handleSubmit}>
      <SearchSuggest
        className="topbar-search-field"
        inputClassName=""
        icon={<Icon name="search" size={16} className="topbar-search-icon" />}
        value={term}
        suggestions={suggestions}
        onChange={setTerm}
        onSelect={go}
        placeholder="Search applicants..."
        aria-label="Search applicants by name or email"
      />
    </form>
  );
}

export default function TopBar({ onMenuClick, leading }) {
  const { session } = useSession();
  const handleLogout = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const userRef = useOutsideClick(() => setMenuOpen(false));
  const notifRef = useOutsideClick(() => setNotifOpen(false));
  const profileMenuItems = PROFILE_MENU_BY_ROLE[session.role] ?? [];

  // The bell lists the announcements applicants see, and that endpoint is
  // applicant-only - staff manage announcements from their own page - so
  // the bell (and the request behind it) is for applicants alone.
  const showAnnouncements = session.role === "Applicant";

  useEffect(() => {
    if (!showAnnouncements) return;
    getActiveAnnouncements()
      .then(setAnnouncements)
      .catch(() => setAnnouncements([]));
  }, [showAnnouncements]);

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

      {leading ? <div className="topbar-leading">{leading}</div> : null}
      {session.role === "Admin" && <ApplicationSearch />}

      <div className="topbar-spacer" />

      {showAnnouncements && (
      <div className="topbar-notif" ref={notifRef}>
        <button
          type="button"
          className="topbar-icon-button"
          onClick={() => setNotifOpen((open) => !open)}
          aria-label="Announcements"
          aria-haspopup="true"
          aria-expanded={notifOpen}
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
      )}

      <div className="topbar-user" ref={userRef}>
        <button
          type="button"
          className="topbar-user-button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-haspopup="menu"
          aria-label={`${session.firstName} ${session.lastName} account menu`}
          aria-expanded={menuOpen}
        >
          <span className="topbar-avatar">{initials(session.firstName, session.lastName)}</span>
          <span className="topbar-user-text">
            <span className="topbar-user-name">
              {session.firstName} {session.lastName}
            </span>
            <span className="topbar-user-role">{ROLE_SHORT_LABELS[session.role] ?? session.role}</span>
          </span>
        </button>

        {menuOpen ? (
          <div className="topbar-panel topbar-menu">
            <div className="topbar-user-text topbar-menu-identity">
              <span className="topbar-user-name">
                {session.firstName} {session.lastName}
              </span>
              <span className="topbar-user-role">{ROLE_SHORT_LABELS[session.role] ?? session.role}</span>
            </div>
            <div className="topbar-menu-divider" />
            {profileMenuItems.map((item) => (
              <Link key={item.to} to={item.to} className="topbar-menu-item" onClick={() => setMenuOpen(false)}>
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
