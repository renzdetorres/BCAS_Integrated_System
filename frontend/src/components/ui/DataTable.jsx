import { useMemo, useState } from "react";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import Icon from "./Icon.jsx";
import "./DataTable.css";

const PAGE_SIZES = [10, 25, 50];

/**
 * Column renderers are called, not handed to flexRender: flexRender treats a
 * function as a component type, and these are recreated on every render, so
 * React would remount every cell each time and drop focus from whatever
 * inside it (a checkbox, a button) the user had just used.
 */
function renderDef(definition, context) {
  return typeof definition === "function" ? definition(context) : definition;
}

function textOf(value) {
  if (value == null) return "";
  return typeof value === "string" ? value : String(value);
}

/**
 * The system's one list view, on TanStack Table: a header (page title,
 * subtitle, actions), a filter row, the table, and pagination.
 *
 * columns: [{ key, header, render?(row), accessor?(row), sortable?, align?, width? }]
 *   `accessor` feeds sorting and search; `render` is what's shown.
 * search:  { value, onChange, placeholder } - controlled, for pages whose API
 *          searches server-side. Omit it and pass `searchPlaceholder` to get a
 *          client-side search over every column's accessor instead.
 * filters: [{ key, label, value, onChange, options: [{ value, label }] }]
 *          Dropdowns share the left half of the filter row at equal widths;
 *          search takes the right half.
 * extraToolbar: an extra control placed with the dropdowns; `extraToolbarSlots`
 *          is how many dropdown-widths it takes (default 1).
 * textFilters: [{ key, label, value, onChange }] - separate text fields that
 *          take the search half of the row (e.g. Name and Email), filtering
 *          client-side on the column with the same key. Replaces search.
 * actions / onExport: rendered in the header, right of the title.
 * notice: a banner under the header (e.g. a lock that applies to the list).
 * summary: [{ label, value, tone?, onClick?, active? }] full-width summary cards under the
 *          header, with `summaryNote` (their description) below them.
 */
export default function DataTable({
  title,
  subtitle,
  titleAs: TitleTag = "h1",
  actions = null,
  columns,
  rows,
  getRowKey = (row) => row.id,
  search,
  searchPlaceholder,
  filters = [],
  extraToolbar = null,
  extraToolbarSlots = 1,
  onExport,
  isLoading = false,
  errorMessage = null,
  emptyMessage = "No results.",
  onRowClick,
  pageSize: initialPageSize = 10,
  footerNote = null,
  summary = null,
  summaryNote = null,
  notice = null,
  textFilters = null,
}) {
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const clientSearch = !search && Boolean(searchPlaceholder);

  const tableColumns = useMemo(
    () =>
      columns.map((column) => ({
        id: column.key,
        accessorFn: column.accessor ?? ((row) => row[column.key]),
        header: () => column.header,
        // Without a render, show the accessor's value - the same value search
        // and sort use - so a column like a document label shows its label.
        cell: ({ row }) =>
          column.render
            ? column.render(row.original)
            : textOf(column.accessor ? column.accessor(row.original) : row.original[column.key]),
        enableSorting: Boolean(column.sortable),
        enableGlobalFilter: column.searchable !== false,
        sortUndefined: "last",
        meta: {
          align: column.align,
          width: column.width,
          // Dates, statuses and actions read as one unit - never split them.
          className: [
            column.className,
            column.key === "action" ? "ui-datatable-action" : "",
            (column.nowrap ?? (/(At|Date)$/.test(column.key) || ["status", "action"].includes(column.key)))
              ? "ui-datatable-nowrap"
              : "",
          ]
            .filter(Boolean)
            .join(" "),
        },
      })),
    [columns],
  );

  // Text filters narrow rows before the table sees them, so sorting,
  // paging and counts all reflect them.
  const filteredRows = useMemo(() => {
    const active = (textFilters ?? []).filter((f) => f.value.trim() !== "");
    if (active.length === 0) return rows;
    return rows.filter((row) =>
      active.every((f) => {
        const column = columns.find((c) => c.key === f.key);
        const value = column?.accessor ? column.accessor(row) : row[f.key];
        return textOf(value).toLowerCase().includes(f.value.trim().toLowerCase());
      }),
    );
  }, [rows, textFilters, columns]);

  const table = useReactTable({
    data: filteredRows,
    columns: tableColumns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) =>
      textOf(row.getValue(columnId)).toLowerCase().includes(String(filterValue).toLowerCase()),
    getRowId: (row) => String(getRowKey(row)),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: initialPageSize } },
  });

  const { pageIndex, pageSize } = table.getState().pagination;
  const filteredCount = table.getFilteredRowModel().rows.length;
  const pageRows = table.getRowModel().rows;
  const pageCount = Math.max(1, table.getPageCount());
  const firstShown = filteredCount === 0 ? 0 : pageIndex * pageSize + 1;
  const lastShown = Math.min(filteredCount, (pageIndex + 1) * pageSize);

  const searchValue = search ? search.value : globalFilter;
  const onSearchChange = search ? search.onChange : setGlobalFilter;
  const hasTextFilters = Array.isArray(textFilters) && textFilters.length > 0;
  const hasSearch = !hasTextFilters && (Boolean(search) || clientSearch);
  const filterControls = filters.length + (extraToolbar ? extraToolbarSlots : 0);
  const hasToolbar = hasSearch || hasTextFilters || filterControls > 0;
  const hasHeader = Boolean(title || subtitle || actions || onExport);

  return (
    <section className="ui-datatable">
      {hasHeader ? (
        <header className="ui-datatable-header">
          <div className="ui-datatable-heading">
            {title ? <TitleTag className="ui-datatable-title">{title}</TitleTag> : null}
            {subtitle ? <p className="ui-datatable-subtitle">{subtitle}</p> : null}
          </div>
          {actions || onExport ? (
            <div className="ui-datatable-actions">
              {onExport ? (
                <button type="button" className="btn btn-secondary" onClick={onExport}>
                  Export
                </button>
              ) : null}
              {actions}
            </div>
          ) : null}
        </header>
      ) : null}

      {notice ? <div className="ui-datatable-notice">{notice}</div> : null}

      {summary ? (
        <div className="ui-datatable-summary-block">
          <div className="ui-datatable-summary" style={{ "--summary-count": summary.length }}>
            {summary.map((item) => {
              const Tag = item.onClick ? "button" : "div";
              return (
                <Tag
                  key={item.label}
                  type={item.onClick ? "button" : undefined}
                  onClick={item.onClick}
                  aria-pressed={item.onClick ? Boolean(item.active) : undefined}
                  className={`ui-datatable-summary-card${item.tone && String(item.value) !== "0" ? ` ui-datatable-summary-${item.tone}` : ""}${item.onClick ? " ui-datatable-summary-action" : ""}${item.active ? " is-active" : ""}`}
                >
                  <span className="ui-datatable-summary-label">{item.label}</span>
                  <span className="ui-datatable-summary-value">
                    {isLoading ? <span className="ui-datatable-skeleton ui-datatable-skeleton-value" /> : item.value}
                  </span>
                </Tag>
              );
            })}
          </div>
          {summaryNote ? <p className="ui-datatable-summary-note">{summaryNote}</p> : null}
        </div>
      ) : null}

      {hasToolbar ? (
        <div className={`ui-datatable-toolbar${filterControls === 0 ? " ui-datatable-toolbar-search-only" : ""}`}>
          {filterControls > 0 ? (
            <div className="ui-datatable-filters" style={{ "--filter-count": filterControls }}>
              {filters.map((filter) => (
                <select
                  key={filter.key}
                  className="ui-select ui-datatable-filter"
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
              {extraToolbar ? <div className="ui-datatable-extra" style={{ gridColumn: `span ${extraToolbarSlots}` }}>{extraToolbar}</div> : null}
            </div>
          ) : null}
          {hasTextFilters ? (
            <div className="ui-datatable-text-filters" style={{ "--filter-count": textFilters.length }}>
              {textFilters.map((filter) => (
                <label key={filter.key} className="ui-datatable-search">
                  <Icon name="search" size={16} className="ui-datatable-search-icon" />
                  <input
                    type="search"
                    className="ui-input"
                    placeholder={filter.label}
                    aria-label={filter.label}
                    value={filter.value}
                    onChange={(event) => {
                      filter.onChange(event.target.value);
                      table.setPageIndex(0);
                    }}
                  />
                </label>
              ))}
            </div>
          ) : null}
          {hasSearch ? (
            <label className="ui-datatable-search">
              <Icon name="search" size={16} className="ui-datatable-search-icon" />
              <input
                type="search"
                className="ui-input"
                placeholder={search?.placeholder ?? searchPlaceholder ?? "Search..."}
                aria-label={search?.placeholder ?? searchPlaceholder ?? "Search"}
                value={searchValue}
                onChange={(event) => {
                  onSearchChange(event.target.value);
                  table.setPageIndex(0);
                }}
              />
            </label>
          ) : null}
        </div>
      ) : null}

      <div className="ui-datatable-scroll">
        <table className="ui-datatable-table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const { align, width, className } = header.column.columnDef.meta ?? {};
                  const sorted = header.column.getIsSorted();
                  const canSort = header.column.getCanSort();
                  return (
                    <th
                      key={header.id}
                      style={width ? { width } : undefined}
                      className={[align ? `ui-datatable-align-${align}` : "", className ?? ""].join(" ").trim() || undefined}
                      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                    >
                      {canSort ? (
                        <button
                          type="button"
                          className="ui-datatable-sort"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {renderDef(header.column.columnDef.header, header.getContext())}
                          <span className={`ui-datatable-sort-icon${sorted ? " is-sorted" : ""}`} aria-hidden="true">
                            {sorted === "desc" ? "↓" : sorted === "asc" ? "↑" : "↕"}
                          </span>
                        </button>
                      ) : (
                        renderDef(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }, (_, i) => (
                <tr key={`skeleton-${i}`} className="ui-datatable-skeleton-row" aria-hidden="true">
                  {columns.map((column) => (
                    <td key={column.key}>
                      <span className="ui-datatable-skeleton" />
                    </td>
                  ))}
                </tr>
              ))
            ) : errorMessage ? (
              <tr>
                <td colSpan={columns.length} className="ui-datatable-empty ui-datatable-error" role="alert">
                  {errorMessage}
                </td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="ui-datatable-empty">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={onRowClick ? "ui-datatable-row-clickable" : undefined}
                >
                  {row.getVisibleCells().map((cell) => {
                    const { align, className } = cell.column.columnDef.meta ?? {};
                    return (
                      <td
                        key={cell.id}
                        className={[align ? `ui-datatable-align-${align}` : "", className ?? ""].join(" ").trim() || undefined}
                      >
                        {renderDef(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && !errorMessage && filteredCount > 0 ? (
        <footer className="ui-datatable-footer">
          <p className="ui-datatable-count">
            {footerNote ? <span className="ui-datatable-footer-note">{footerNote}</span> : null}
            Showing <strong>{firstShown.toLocaleString()}</strong>-<strong>{lastShown.toLocaleString()}</strong> of{" "}
            <strong>{filteredCount.toLocaleString()}</strong>
          </p>
          <div className="ui-datatable-pager">
            <label className="ui-datatable-page-size">
              Rows
              <select
                className="ui-select"
                value={pageSize}
                onChange={(event) => table.setPageSize(Number(event.target.value))}
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="ui-datatable-page-button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
            >
              <Icon name="chevron-right" size={16} className="ui-datatable-flip" />
            </button>
            <span className="ui-datatable-page-status">
              Page {pageIndex + 1} of {pageCount}
            </span>
            <button
              type="button"
              className="ui-datatable-page-button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
            >
              <Icon name="chevron-right" size={16} />
            </button>
          </div>
        </footer>
      ) : null}
    </section>
  );
}

/** A compact "View" button for a table's Action column; stops the row's own click. */
export function RowAction({ label = "View", icon = "eye", onClick, ariaLabel, disabled = false, title }) {
  return (
    <button
      type="button"
      className="ui-datatable-row-action"
      aria-label={ariaLabel}
      disabled={disabled}
      title={title}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <Icon name={icon} size={15} />
      <span className="ui-datatable-row-action-label">{label}</span>
    </button>
  );
}

/** Name over a secondary line (email, detail) - the standard first cell of a record row. */
export function PersonCell({ name, detail }) {
  return (
    <span className="ui-cell-person">
      <span className="ui-cell-person-name">{name}</span>
      {detail ? <span className="ui-cell-person-detail">{detail}</span> : null}
    </span>
  );
}
