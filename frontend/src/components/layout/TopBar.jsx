import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSession } from "../../context/SessionContext.jsx";
import { useLogout } from "../../hooks/useLogout.js";
import { getActiveAnnouncements } from "../../api/announcementApi.js";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "../../api/notificationsApi.js";
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

/** "5 min ago", "3 h ago", "Oct 12" - the notification's age at a glance. */
function timeAgo(isoDateTime) {
  const minutes = Math.round((Date.now() - new Date(isoDateTime).getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} h ago`;
  return formatDate(isoDateTime);
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
  const [inbox, setInbox] = useState({ unreadCount: 0, items: [] });
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

  // System notifications: loaded up front, refreshed whenever the bell opens
  // and once a minute, so a verified payment shows up without a page reload.
  useEffect(() => {
    if (!showAnnouncements) return undefined;
    let cancelled = false;
    const load = () =>
      getNotifications()
        .then((data) => {
          if (!cancelled) setInbox(data);
        })
        .catch(() => {});
    load();
    const timer = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [showAnnouncements]);

  function handleBellClick() {
    const opening = !notifOpen;
    setNotifOpen(opening);
    if (opening) getNotifications().then(setInbox).catch(() => {});
  }

  function handleOpenNotification(notification) {
    if (notification.isRead) return;
    setInbox((prev) => ({
      unreadCount: Math.max(0, prev.unreadCount - 1),
      items: prev.items.map((n) => (n.notificationId === notification.notificationId ? { ...n, isRead: true } : n)),
    }));
    markNotificationRead(notification.notificationId).catch(() => {});
  }

  function handleMarkAllRead() {
    setInbox((prev) => ({ unreadCount: 0, items: prev.items.map((n) => ({ ...n, isRead: true })) }));
    markAllNotificationsRead().catch(() => {});
  }

  const recent = announcements.slice(0, 3);
  const recentNotifications = inbox.items.slice(0, 6);

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
          onClick={handleBellClick}
          aria-label={inbox.unreadCount > 0 ? `Notifications, ${inbox.unreadCount} unread` : "Notifications"}
          aria-haspopup="true"
          aria-expanded={notifOpen}
        >
          <Icon name="bell" size={19} />
          {inbox.unreadCount > 0 ? (
            <span className="topbar-notif-badge">{inbox.unreadCount > 9 ? "9+" : inbox.unreadCount}</span>
          ) : null}
        </button>

        {notifOpen ? (
          <div className="topbar-panel topbar-notif-panel">
            <div className="topbar-panel-header topbar-notif-header">
              <span>Notifications</span>
              {inbox.unreadCount > 0 ? (
                <button type="button" className="topbar-notif-markall" onClick={handleMarkAllRead}>
                  Mark all read
                </button>
              ) : null}
            </div>
            {recentNotifications.length === 0 ? (
              <p className="topbar-notif-empty">You&apos;re all caught up.</p>
            ) : (
              <ul className="topbar-notif-list">
                {recentNotifications.map((notification) => (
                  <li key={notification.notificationId} className={notification.isRead ? undefined : "topbar-notif-unread"}>
                    <button type="button" className="topbar-notif-item" onClick={() => handleOpenNotification(notification)}>
                      <span className="topbar-notif-title">{notification.title}</span>
                      <span className="topbar-notif-body">{notification.body.replace(/^Hi [^,]+,\s*/, "")}</span>
                      <span className="topbar-notif-meta">{timeAgo(notification.createdAt)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {recent.length > 0 ? (
              <>
                <div className="topbar-panel-header">Announcements</div>
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
              </>
            ) : null}
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
