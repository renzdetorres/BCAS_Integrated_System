import { NavLink } from "react-router-dom";
import { LogOut, X } from "lucide-react";
import { useLogout } from "../../hooks/useLogout.js";

export default function Sidebar({ subtitle, items, badges = {}, isOpen, onClose }) {
  const handleLogout = useLogout();

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 transform flex-col bg-forest text-white transition-transform duration-200 md:static md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 pb-4 pt-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-sm font-extrabold text-forest">
                B
              </span>
              <span className="text-xl font-extrabold tracking-wide">BCAS</span>
            </div>
            <p className="mt-1 text-[11px] font-semibold tracking-widest text-white/60">{subtitle}</p>
          </div>
          <button type="button" className="text-white/70 md:hidden" onClick={onClose} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {items.map((item) => {
            const Icon = item.icon;
            const badgeValue = item.badgeKey ? badges[item.badgeKey] : undefined;
            return (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.to === "/portal"}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-gold text-forest-dark"
                      : "text-white/85 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <Icon size={18} strokeWidth={2} />
                <span className="flex-1">{item.label}</span>
                {!!badgeValue && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-orange-500 px-1.5 text-[11px] font-bold text-white">
                    {badgeValue}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="px-3 pb-6 pt-2">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white"
          >
            <LogOut size={18} strokeWidth={2} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
