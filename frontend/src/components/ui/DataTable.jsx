import { useMemo, useState } from "react";
import "./DataTable.css";

/**
 * Generic list view: search box + optional filter dropdowns + optional export
 * button, backed by whatever real query params the calling page's API
 * function accepts (search/filters are controlled - the page owns the
 * network call). Column sort is client-side over the already-fetched rows.
 *
 * columns: [{ key, header, render?(row), accessor?(row), sortable? }]
 * filters: [{ key, label, value, onChange, options: [{ value, label }] }]
 * extraToolbar: a ReactNode for a filter shape the standard search/select
 * controls don't cover (e.g. a second free-text field) - rendered inline in
 * the same toolbar row so a scanning registrar reads it as one filter bar,
 * not a second control stacked above the table.
 */
export default function DataTable({
  columns,
  rows,
  getRowKey = (row) => row.id,
  search,
  filters = [],
  extraToolbar = null,
  onExport,
  isLoading = false,
  errorMessage = null,
  emptyMessage = "No results.",
  onRowClick,
}) {
  const [sort, setSort] = useState({ key: null, direction: "asc" });

  const sortedRows = useMemo(() => {
    if (!sort.key) return rows;
    const column = columns.find((c) => c.key === sort.key);
    if (!column) return rows;
    const accessor = column.accessor ?? ((row) => row[column.key]);
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return sort.direction === "asc" ? -1 : 1;
      if (av > bv) return sort.direction === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [rows, sort, columns]);

  function toggleSort(key) {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  }

  const hasToolbar = Boolean(search) || filters.length > 0 || Boolean(extraToolbar) || Boolean(onExport);

  return (
    <div className="ui-datatable">
      {hasToolbar ? (
        <div className="ui-datatable-toolbar">
          <div className="ui-datatable-toolbar-controls">
            {search ? (
              <input
                type="search"
                className="ui-datatable-search"
                placeholder={search.placeholder ?? "Search..."}
                value={search.value}
                onChange={(event) => search.onChange(event.target.value)}
              />
            ) : null}
            {filters.map((filter) => (
              <select
                key={filter.key}
                className="ui-datatable-filter"
                value={filter.value}
                onChange={(event) => filter.onChange(event.target.value)}
                aria-label={filter.label}
              >
                <option value="">{filter.label}</option>
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ))}
            {extraToolbar}
          </div>
          {onExport ? (
            <button type="button" className="ui-datatable-export" onClick={onExport}>
              Export
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="ui-datatable-scroll">
        <table className="ui-datatable-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={column.sortable ? "ui-datatable-th-sortable" : ""}
                  onClick={column.sortable ? () => toggleSort(column.key) : undefined}
                >
                  {column.header}
                  {column.sortable && sort.key === column.key ? (
                    <span className="ui-datatable-sort-arrow">
                      {sort.direction === "asc" ? " ↑" : " ↓"}
                    </span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="ui-datatable-empty">
                  Loading...
                </td>
              </tr>
            ) : errorMessage ? (
              <tr>
                <td colSpan={columns.length} className="ui-datatable-empty ui-datatable-error">
                  {errorMessage}
                </td>
              </tr>
            ) : sortedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="ui-datatable-empty">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedRows.map((row) => (
                <tr
                  key={getRowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={onRowClick ? "ui-datatable-row-clickable" : ""}
                >
                  {columns.map((column) => (
                    <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
