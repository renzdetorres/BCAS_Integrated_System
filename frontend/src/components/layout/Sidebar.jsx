import { useLayoutEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import Icon from "../ui/Icon.jsx";
import BcasSeal from "../ui/BcasSeal.jsx";
import { useSession } from "../../context/SessionContext.jsx";
import { NAV_ITEMS_BY_ROLE, ROLE_LABELS } from "../../config/navigation.js";
import "./Sidebar.css";

// Every page wraps itself in its own <AppLayout> rather than sharing one
// persistent layout route, so the sidebar's scrollable <nav> is a brand
// new DOM node on every navigation - it would otherwise reset to the top
// each time you click a link. Module-scoped (not component state) so it
// survives that remount within the tab; restored via useLayoutEffect so
// it's set before paint, not as a visible jump after.
let savedScrollTop = 0;

function matchesPath(item, pathname) {
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function matchesQuery(item, searchParams) {
  return Object.entries(item.query).every(([key, value]) => searchParams.get(key) === value);
}

/**
 * A link with a `query` (e.g. a department view of Applications) is active
 * only while its filter is applied. A plain link sharing that path yields
 * to it, so /admin/applications?department=College highlights "College",
 * not "Applications" too.
 */
function isItemActive(item, allItems, location, searchParams) {
  if (!matchesPath(item, location.pathname)) return false;
  if (item.query) return matchesQuery(item, searchParams);
  return !allItems.some(
    (other) => other.query && other.to === item.to && matchesQuery(other, searchParams),
  );
}

export default function Sidebar({ role, isOpen, onNavigate }) {
  const { session, blockedFeatures } = useSession();
  // Pages the principal switched off for this role disappear from the menu,
  // and so does anything marked for Super Admins only.
  const groups = (NAV_ITEMS_BY_ROLE[role] ?? [])
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !blockedFeatures.includes(item.to) && (!item.superAdminOnly || session?.isSuperAdmin),
      ),
    }))
    .filter((group) => group.items.length > 0);
  const subtitle = ROLE_LABELS[role] ?? "Portal";
  const navRef = useRef(null);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const allItems = groups.flatMap((group) => group.items);

  useLayoutEffect(() => {
    if (navRef.current) {
      navRef.current.scrollTop = savedScrollTop;
    }
  }, []);

  return (
    <aside className={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
      <div className="sidebar-brand">
        <span className="sidebar-brand-seal">
          <BcasSeal size={44} />
        </span>
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-mark">
            BCAS<span className="sidebar-brand-dot">.</span>
          </span>
          <span className="sidebar-brand-subtitle">{subtitle}</span>
        </div>
      </div>
      <nav
        className="sidebar-nav"
        ref={navRef}
        onScroll={(event) => {
          savedScrollTop = event.currentTarget.scrollTop;
        }}
      >
        {groups.map((group, index) => (
          <div
            className={`sidebar-group${group.variant ? ` sidebar-group-${group.variant}` : ""}`}
            key={group.section ?? `ungrouped-${index}`}
          >
            {group.section && <span className="sidebar-group-label">{group.section}</span>}
            {group.items.map((item) => {
              const active = isItemActive(item, allItems, location, searchParams);
              const search = item.query ? `?${new URLSearchParams(item.query)}` : "";
              return (
                <Link
                  key={`${item.to}${search}`}
                  to={{ pathname: item.to, search }}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={"sidebar-link" + (active ? " sidebar-link-active" : "")}
                >
                  {item.icon ? (
                    <Icon name={item.icon} size={18} className="sidebar-link-icon" />
                  ) : (
                    <span className="sidebar-link-bullet" aria-hidden="true" />
                  )}
                  <span className="sidebar-link-label">{item.label}</span>
                  {group.variant === "categories" && (
                    <Icon name="chevron-right" size={14} className="sidebar-link-chevron" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
