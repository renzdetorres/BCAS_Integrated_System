import { NavLink } from "react-router-dom";
import Icon from "../ui/Icon.jsx";
import { NAV_ITEMS_BY_ROLE, ROLE_LABELS } from "../../config/navigation.js";
import "./Sidebar.css";

export default function Sidebar({ role, isOpen, onNavigate }) {
  const items = NAV_ITEMS_BY_ROLE[role] ?? [];
  const subtitle = ROLE_LABELS[role] ?? "Portal";

  return (
    <aside className={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark">BCAS</span>
        <span className="sidebar-brand-subtitle">{subtitle}</span>
      </div>
      <nav className="sidebar-nav">
        {items.map((item) => (
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
      </nav>
    </aside>
  );
}
