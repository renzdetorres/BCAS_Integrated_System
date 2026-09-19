import { useState } from "react";
import { Download, Search } from "lucide-react";

/**
 * Generic list table: search box, optional filter dropdowns, optional
 * export button, sortable columns, loading skeleton and empty state.
 * `columns`: [{ key, header, render(row), sortable, sortValue(row) }]
 */
export default function DataTable({
  columns,
  rows,
  rowKey = (row) => row.id,
  isLoading = false,
  emptyMessage = "No records found.",
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters = [],
  onExport,
  exportLabel = "Export",
  selectable = false,
  selectedKeys = [],
  onToggleRow,
  onToggleAll,
}) {
  const [sort, setSort] = useState({ key: null, direction: "asc" });

  function handleSort(column) {
    if (!column.sortable) return;
    setSort((prev) => {
      if (prev.key === column.key) {
        return { key: column.key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key: column.key, direction: "asc" };
    });
  }

  let displayRows = rows;
  if (sort.key) {
    const column = columns.find((c) => c.key === sort.key);
    const getValue = column?.sortValue ?? ((row) => row[sort.key]);
    displayRows = [...rows].sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      if (av === bv) return 0;
      const result = av > bv ? 1 : -1;
      return sort.direction === "asc" ? result : -result;
    });
  }

  const showToolbar = onSearchChange || filters.length > 0 || onExport;

  return (
    <div>
      {showToolbar && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {onSearchChange && (
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest"
              />
            </div>
          )}
          {filters.map((filter) => (
            <select
              key={filter.label}
              value={filter.value}
              onChange={(event) => filter.onChange(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest"
            >
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ))}
          {onExport && (
            <button
              type="button"
              onClick={onExport}
              className="ml-auto inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Download size={16} />
              {exportLabel}
            </button>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full min-w-max border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {selectable && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    onChange={(event) => onToggleAll?.(event.target.checked)}
                    checked={rows.length > 0 && selectedKeys.length === rows.length}
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  onClick={() => handleSort(column)}
                  className={`px-4 py-3 ${column.sortable ? "cursor-pointer select-none hover:text-slate-700" : ""}`}
                >
                  {column.header}
                  {sort.key === column.key && (sort.direction === "asc" ? " ↑" : " ↓")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  {selectable && <td className="px-4 py-4" />}
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-4">
                      <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                    </td>
                  ))}
                </tr>
              ))}

            {!isLoading && displayRows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-10 text-center text-sm text-slate-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}

            {!isLoading &&
              displayRows.map((row) => (
                <tr key={rowKey(row)} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                  {selectable && (
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedKeys.includes(rowKey(row))}
                        onChange={(event) => onToggleRow?.(rowKey(row), event.target.checked)}
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-4 align-middle text-slate-700">
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
