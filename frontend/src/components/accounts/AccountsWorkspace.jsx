import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ALL_ROLES } from "../../api/adminApi.js";
import { ROLE_SHORT_LABELS } from "../../config/navigation.js";
import Icon from "../ui/Icon.jsx";
import SearchSuggest, { buildSuggestions } from "../ui/SearchSuggest.jsx";
import "./AccountsWorkspace.css";

const PAGE_SIZES = [10, 25, 50];

const SORTS = [
  { key: "name", label: "Name", get: (u) => `${u.firstName} ${u.lastName}` },
  { key: "email", label: "Email", get: (u) => u.email },
  { key: "status", label: "Status", get: (u) => (u.isActive ? "Active" : "Deactivated") },
  { key: "role", label: "Role", get: (u) => ROLE_SHORT_LABELS[u.role] ?? u.role },
];

const roleLabel = (role) => ROLE_SHORT_LABELS[role] ?? role;
const fullName = (user) => `${user.firstName} ${user.lastName}`;
const initials = (user) => `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();

/**
 * A button that opens a small menu under it. The menu is positioned from the button
 * (position: fixed), so a table's own scroll area never clips it. It closes on a click
 * outside, Escape, scrolling or resizing, and arrow keys move between its items.
 */
function MenuButton({ label, icon, count, align = "right", className = "btn btn-secondary", children, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPlace({ top: rect.bottom + 6, left: align === "right" ? undefined : rect.left, right: align === "right" ? window.innerWidth - rect.right : undefined });
  }, [open, align]);

  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    function onPointer(event) {
      if (!menuRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) close();
    }
    function onKey(event) {
      if (event.key === "Escape") {
        close();
        buttonRef.current?.focus();
      } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const items = Array.from(menuRef.current?.querySelectorAll("[role^='menuitem']:not(:disabled)") ?? []);
        const at = items.indexOf(document.activeElement);
        items[(at + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
      }
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    menuRef.current?.querySelector("[role^='menuitem']:not(:disabled)")?.focus();
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  return (
    <>
      <button ref={buttonRef} type="button" className={className} aria-haspopup="menu" aria-expanded={open} aria-label={ariaLabel} onClick={() => setOpen((v) => !v)}>
        {icon ? <Icon name={icon} size={16} /> : null}
        {label ? <span>{label}</span> : null}
        {count ? <span className="accounts-count-badge">{count}</span> : null}
      </button>
      {open ? (
        <div ref={menuRef} className="accounts-menu" role="menu" style={place ?? { visibility: "hidden" }} onClick={(event) => (event.target.closest("[data-keep-open]") ? null : setOpen(false))}>
          {children}
        </div>
      ) : null}
    </>
  );
}

/**
 * Account Management, laid out as a workspace: account types down the left, and on the right one
 * card with the search, filter and sort controls above a table of accounts (checkbox, member,
 * email, status, role, and a row menu). Selecting rows offers Activate / Deactivate for all of them.
 */
export default function AccountsWorkspace({
  users,
  isLoading,
  errorMessage,
  currentUserId,
  canDelete,
  pendingUserId,
  onEdit,
  onDeactivate,
  onActivate,
  onDelete,
  onBulkStatus,
}) {
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState(null); // { key, dir }
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(() => new Set());

  const counts = useMemo(() => {
    const byRole = { "": users.length };
    for (const role of ALL_ROLES) byRole[role] = users.filter((u) => u.role === role).length;
    return byRole;
  }, [users]);

  const unassignedHeads = users.filter((u) => u.role === "AcademicHead" && !u.department).length;

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let list = users.filter(
      (u) =>
        (!roleFilter || u.role === roleFilter) &&
        (!statusFilter || (statusFilter === "active" ? u.isActive : !u.isActive)) &&
        (!onlyUnassigned || (u.role === "AcademicHead" && !u.department)) &&
        (!needle || `${fullName(u)} ${u.email} ${roleLabel(u.role)} ${u.department ?? ""}`.toLowerCase().includes(needle)),
    );
    if (sort) {
      const get = SORTS.find((s) => s.key === sort.key).get;
      list = [...list].sort((a, b) => get(a).localeCompare(get(b), undefined, { sensitivity: "base" }) * (sort.dir === "desc" ? -1 : 1));
    }
    return list;
  }, [users, roleFilter, statusFilter, onlyUnassigned, query, sort]);

  // Anything that changes the list returns to page one and forgets rows that are no longer shown.
  useEffect(() => {
    setPage(0);
  }, [roleFilter, statusFilter, onlyUnassigned, query, sort, pageSize]);

  useEffect(() => {
    setSelected((prev) => {
      const present = new Set(users.map((u) => u.userId));
      const next = new Set([...prev].filter((id) => present.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [users]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const visible = rows.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const selectable = visible.filter((u) => u.userId !== currentUserId);
  const allSelected = selectable.length > 0 && selectable.every((u) => selected.has(u.userId));
  const chosen = users.filter((u) => selected.has(u.userId));
  const filtersOn = (statusFilter ? 1 : 0) + (onlyUnassigned ? 1 : 0);

  function toggleSort(key) {
    setSort((prev) => (!prev || prev.key !== key ? { key, dir: "asc" } : prev.dir === "asc" ? { key, dir: "desc" } : null));
  }

  function toggleRow(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) selectable.forEach((u) => next.delete(u.userId));
      else selectable.forEach((u) => next.add(u.userId));
      return next;
    });
  }

  const sortLabel = sort ? `${SORTS.find((s) => s.key === sort.key).label} (${sort.dir === "asc" ? "A to Z" : "Z to A"})` : "Sort by";
  const suggestions = buildSuggestions(users.flatMap((u) => [fullName(u), u.email]), query);

  return (
    <div className="accounts-shell">
      <nav className="accounts-nav" aria-label="Account types">
        <ul>
          {[{ role: "", label: "All accounts" }, ...ALL_ROLES.map((role) => ({ role, label: roleLabel(role) }))].map((item) => (
            <li key={item.role || "all"}>
              <button type="button" className={`accounts-nav-item${roleFilter === item.role ? " is-active" : ""}`} aria-pressed={roleFilter === item.role} onClick={() => setRoleFilter(item.role)}>
                <span>{item.label}</span>
                <span className="accounts-nav-count">{isLoading ? "" : counts[item.role]}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <section className="accounts-main" aria-label="Accounts">
        <header className="accounts-head">
          <div className="accounts-heading">
            <h2>{roleFilter ? roleLabel(roleFilter) : "All accounts"}</h2>
            <p>
              {isLoading ? "Loading accounts" : `${rows.length.toLocaleString()} ${rows.length === 1 ? "account" : "accounts"}`}
              {rows.length !== counts[roleFilter] ? ` of ${counts[roleFilter].toLocaleString()}` : ""}
            </p>
          </div>

          <div className="accounts-tools">
            <SearchSuggest
              className="accounts-search"
              icon={<Icon name="search" size={16} className="ui-datatable-search-icon" />}
              placeholder="Search by name or email"
              aria-label="Search accounts"
              value={query}
              suggestions={suggestions}
              onChange={setQuery}
            />

            <MenuButton label="Filter" icon="clipboard" count={filtersOn || null} ariaLabel="Filter accounts">
              <p className="accounts-menu-title">Status</p>
              {[
                { value: "", label: "Any status" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Deactivated" },
              ].map((option) => (
                <button key={option.value} type="button" role="menuitemradio" aria-checked={statusFilter === option.value} className="accounts-menu-item" onClick={() => setStatusFilter(option.value)}>
                  <span className="accounts-menu-check">{statusFilter === option.value ? <Icon name="check" size={14} /> : null}</span>
                  {option.label}
                </button>
              ))}
              {unassignedHeads > 0 ? (
                <>
                  <p className="accounts-menu-title">Needs attention</p>
                  <button type="button" role="menuitemcheckbox" aria-checked={onlyUnassigned} className="accounts-menu-item" data-keep-open onClick={() => setOnlyUnassigned((v) => !v)}>
                    <span className="accounts-menu-check">{onlyUnassigned ? <Icon name="check" size={14} /> : null}</span>
                    Academic Heads without a department ({unassignedHeads})
                  </button>
                </>
              ) : null}
              {filtersOn ? (
                <button type="button" role="menuitem" className="accounts-menu-item accounts-menu-clear" onClick={() => { setStatusFilter(""); setOnlyUnassigned(false); }}>
                  Clear filters
                </button>
              ) : null}
            </MenuButton>

            <MenuButton label={sortLabel} icon="trend-up" ariaLabel="Sort accounts">
              <button type="button" role="menuitemradio" aria-checked={!sort} className="accounts-menu-item" onClick={() => setSort(null)}>
                <span className="accounts-menu-check">{!sort ? <Icon name="check" size={14} /> : null}</span>
                Default order
              </button>
              {SORTS.flatMap((item) =>
                ["asc", "desc"].map((dir) => {
                  const on = sort?.key === item.key && sort.dir === dir;
                  return (
                    <button key={item.key + dir} type="button" role="menuitemradio" aria-checked={on} className="accounts-menu-item" onClick={() => setSort({ key: item.key, dir })}>
                      <span className="accounts-menu-check">{on ? <Icon name="check" size={14} /> : null}</span>
                      {item.label} ({dir === "asc" ? "A to Z" : "Z to A"})
                    </button>
                  );
                }),
              )}
            </MenuButton>
          </div>
        </header>

        {unassignedHeads > 0 && !onlyUnassigned ? (
          <p className="accounts-attention" role="status">
            <Icon name="alert" size={16} />
            <span>
              {unassignedHeads} Academic {unassignedHeads === 1 ? "Head has" : "Heads have"} no department and sees no applicants until one is assigned.
            </span>
            <button type="button" className="documents-view-link" onClick={() => { setRoleFilter(""); setOnlyUnassigned(true); }}>
              Show them
            </button>
          </p>
        ) : null}

        {chosen.length > 0 ? (
          <div className="accounts-bulk" role="status">
            <span className="accounts-bulk-count">{chosen.length} selected</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelected(new Set())}>
              Clear
            </button>
            {chosen.some((u) => u.isActive) ? (
              <button type="button" className="btn btn-warning btn-sm" onClick={() => onBulkStatus(chosen.filter((u) => u.isActive), false)}>
                Deactivate selected
              </button>
            ) : null}
            {chosen.some((u) => !u.isActive) ? (
              <button type="button" className="btn btn-success btn-sm" onClick={() => onBulkStatus(chosen.filter((u) => !u.isActive), true)}>
                Activate selected
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="ui-datatable-scroll accounts-scroll">
          <table className="ui-datatable-table accounts-table">
            <thead>
              <tr>
                <th className="accounts-check">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={selectable.length === 0} aria-label="Select every account on this page" />
                </th>
                {[
                  { key: "name", header: "Member full name" },
                  { key: "email", header: "Email address" },
                  { key: "status", header: "Status" },
                  { key: "role", header: "Role" },
                ].map((column) => {
                  const sorted = sort?.key === column.key ? sort.dir : null;
                  return (
                    <th key={column.key} aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}>
                      <button type="button" className="ui-datatable-sort" onClick={() => toggleSort(column.key)}>
                        {column.header}
                        <span className={`ui-datatable-sort-icon${sorted ? " is-sorted" : ""}`} aria-hidden="true">
                          {sorted === "desc" ? "↓" : sorted === "asc" ? "↑" : "↕"}
                        </span>
                      </button>
                    </th>
                  );
                })}
                <th className="accounts-more">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }, (_, i) => (
                  <tr key={i} className="ui-datatable-skeleton-row" aria-hidden="true">
                    {Array.from({ length: 6 }, (__, c) => (
                      <td key={c}>
                        <span className="ui-datatable-skeleton" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : errorMessage ? (
                <tr>
                  <td colSpan={6} className="ui-datatable-empty ui-datatable-error" role="alert">
                    {errorMessage}
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="ui-datatable-empty">
                    {users.length === 0 ? "No accounts yet." : "No accounts match these filters."}
                  </td>
                </tr>
              ) : (
                visible.map((user) => {
                  const isSelf = user.userId === currentUserId;
                  return (
                    <tr key={user.userId} className={selected.has(user.userId) ? "is-selected" : undefined}>
                      <td className="accounts-check">
                        <input type="checkbox" checked={selected.has(user.userId)} onChange={() => toggleRow(user.userId)} disabled={isSelf} title={isSelf ? "You can't select your own account" : undefined} aria-label={`Select ${fullName(user)}`} />
                      </td>
                      <td>
                        <span className="account-cell">
                          <span className={`account-avatar${user.isActive ? "" : " account-avatar-off"}`} aria-hidden="true">
                            {initials(user)}
                          </span>
                          <span className="account-name">
                            {fullName(user)}
                            {isSelf ? <span className="account-you">You</span> : null}
                          </span>
                        </span>
                      </td>
                      <td>
                        <span className="account-email" title={user.email}>
                          {user.email}
                        </span>
                      </td>
                      <td className="ui-datatable-nowrap">
                        <span className={`accounts-status${user.isActive ? " is-on" : ""}`}>{user.isActive ? "Active" : "Deactivated"}</span>
                      </td>
                      <td>
                        <span className="account-role">
                          <span className="account-role-chip accounts-role-chip">{roleLabel(user.role)}</span>
                          {user.isSuperAdmin ? <span className="account-super-tag">Full controls</span> : null}
                        </span>
                        {user.role === "AcademicHead" ? (
                          user.department ? (
                            <span className="accounts-dept">{user.department}</span>
                          ) : (
                            <span className="accounts-dept department-missing" title="This Academic Head sees no applicants until a department is assigned">
                              Not assigned
                            </span>
                          )
                        ) : null}
                      </td>
                      <td className="accounts-more">
                        <MenuButton icon="dots" className="accounts-kebab" ariaLabel={`Actions for ${fullName(user)}`}>
                          <button type="button" role="menuitem" className="accounts-menu-item" onClick={() => onEdit(user)}>
                            <Icon name="settings" size={15} />
                            Edit
                          </button>
                          {user.isActive ? (
                            <button type="button" role="menuitem" className="accounts-menu-item is-warn" disabled={isSelf || pendingUserId === user.userId} title={isSelf ? "You can't change your own account's status" : undefined} onClick={() => onDeactivate(user)}>
                              <Icon name="lock" size={15} />
                              {pendingUserId === user.userId ? "Saving..." : "Deactivate"}
                            </button>
                          ) : (
                            <button type="button" role="menuitem" className="accounts-menu-item is-good" disabled={pendingUserId === user.userId} onClick={() => onActivate(user)}>
                              <Icon name="check" size={15} />
                              {pendingUserId === user.userId ? "Saving..." : "Activate"}
                            </button>
                          )}
                          {canDelete ? (
                            <button type="button" role="menuitem" className="accounts-menu-item is-bad" disabled={isSelf} title={isSelf ? "You can't delete your own account" : undefined} onClick={() => onDelete(user)}>
                              <Icon name="trash" size={15} />
                              Delete
                            </button>
                          ) : null}
                        </MenuButton>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && !errorMessage && rows.length > 0 ? (
          <footer className="ui-datatable-footer">
            <p className="ui-datatable-count">
              <span className="ui-datatable-footer-note">
                Showing {safePage * pageSize + 1} to {Math.min((safePage + 1) * pageSize, rows.length)} of {rows.length}
              </span>
            </p>
            <div className="ui-datatable-pager">
              <label className="ui-datatable-page-size">
                Rows
                <select className="ui-select" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="ui-datatable-page-button" onClick={() => setPage(safePage - 1)} disabled={safePage === 0} aria-label="Previous page">
                <Icon name="chevron-right" size={16} className="ui-datatable-flip" />
              </button>
              <span className="ui-datatable-page-status">
                Page {safePage + 1} of {pageCount}
              </span>
              <button type="button" className="ui-datatable-page-button" onClick={() => setPage(safePage + 1)} disabled={safePage >= pageCount - 1} aria-label="Next page">
                <Icon name="chevron-right" size={16} />
              </button>
            </div>
          </footer>
        ) : null}
      </section>
    </div>
  );
}
