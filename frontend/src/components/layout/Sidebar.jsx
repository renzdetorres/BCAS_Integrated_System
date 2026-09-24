import { useLayoutEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import Icon from "../ui/Icon.jsx";
import BcasSeal from "../ui/BcasSeal.jsx";
import { NAV_ITEMS_BY_ROLE, ROLE_LABELS } from "../../config/navigation.js";
import "./Sidebar.css";

// Every page wraps itself in its own <AppLayout> rather than sharing one
// persistent layout route, so the sidebar's scrollable <nav> is a brand
// new DOM node on every navigation - it would otherwise reset to the top
// each time you click a link. Module-scoped (not component state) so it
// survives that remount within the tab; restored via useLayoutEffect so
// it's set before paint, not as a visible jump after.
let savedScrollTop = 0;

export default function Sidebar({ role, isOpen, onNavigate }) {
  const groups = NAV_ITEMS_BY_ROLE[role] ?? [];
  const subtitle = ROLE_LABELS[role] ?? "Portal";
  const navRef = useRef(null);

  useLayoutEffect(() => {
    if (navRef.current) {
      navRef.current.scrollTop = savedScrollTop;
    }
  }, []);

  return (
    <aside className={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
      <div className="sidebar-brand">
        <BcasSeal size={38} />
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-mark">BCAS</span>
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
          <div className="sidebar-group" key={group.section ?? `ungrouped-${index}`}>
            {group.section && <span className="sidebar-group-label">{group.section}</span>}
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) => "sidebar-link" + (isActive ? " sidebar-link-active" : "")}
              >
                <Icon name={item.icon} size={18} className="sidebar-link-icon" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
