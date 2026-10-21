import { Legend, useChartTip } from "./chartKit.jsx";
import "./charts.css";

const days = (value) => `${value.toFixed(1)} day${value === 1 ? "" : "s"}`;

/**
 * How long things take, as ranges on one shared axis. Each row shows the middle half of cases as a pale
 * span, the median as a dot on it, and (when there is an earlier year) last year's median as a hollow
 * circle, so a move left or right is a faster or slower year. The slowest median is the accent.
 * `rows` is [{ label, median, p25, p75, before, samples }]; a row with no median has nothing to draw.
 */
export default function RangeChart({ rows, ariaLabel }) {
  const { wrapRef, show, showAt, hide, node } = useChartTip();
  const drawn = rows.filter((row) => row.median != null);
  const rawMax = Math.max(...rows.flatMap((row) => [row.p75 ?? 0, row.median ?? 0, row.before ?? 0]), 1);
  const max = rawMax <= 5 ? Math.ceil(rawMax) : Math.ceil(rawMax / 5) * 5;
  const slowest = drawn.length ? drawn.reduce((a, b) => (b.median > a.median ? b : a)).label : null;
  const left = (value) => `${(value / max) * 100}%`;
  const hasBefore = rows.some((row) => row.before != null);

  return (
    <div ref={wrapRef} className="viz-wrap" onPointerLeave={hide}>
      <Legend
        items={[
          { label: "Middle half of cases", color: "color-mix(in srgb, var(--viz-main) 28%, var(--color-surface))" },
          { label: "Median", color: "var(--viz-main)", hollow: false },
          ...(hasBefore ? [{ label: "Last year's median", color: "var(--viz-context)", hollow: true }] : []),
        ]}
      />
      <ul className="viz-range" aria-label={ariaLabel}>
        {rows.map((row) => {
          const content =
            row.median == null
              ? null
              : {
                  title: row.label,
                  rows: [
                    { value: days(row.median), label: "median", color: "var(--viz-main)" },
                    ...(row.p25 != null ? [{ value: `${days(row.p25)} to ${days(row.p75)}`, label: "middle half" }] : []),
                    ...(row.before != null ? [{ value: days(row.before), label: "last year", color: "var(--viz-context)" }] : []),
                    { value: String(row.samples), label: row.samples === 1 ? "case" : "cases" },
                  ],
                };
          return (
            <li
              key={row.label}
              className="viz-range-row"
              tabIndex={content ? 0 : undefined}
              aria-label={row.median == null ? `${row.label}: no data yet` : `${row.label}: median ${days(row.median)}, middle half ${days(row.p25)} to ${days(row.p75)}`}
              onPointerMove={content ? (event) => show(event, content) : undefined}
              onFocus={content ? (event) => showAt(event.currentTarget, content) : undefined}
              onBlur={hide}
            >
              <span className="viz-row-name">{row.label}</span>
              <span className="viz-range-track" aria-hidden="true">
                {row.median != null ? (
                  <>
                    {row.p25 != null ? <span className="viz-range-span" style={{ left: left(row.p25), width: `max(8px, ${left(Math.max(row.p75 - row.p25, 0))})` }} /> : null}
                    {row.before != null ? <span className="viz-range-before" style={{ left: left(row.before) }} /> : null}
                    <span className={`viz-range-median${row.label === slowest ? " is-slowest" : ""}`} style={{ left: left(row.median) }} />
                  </>
                ) : null}
              </span>
              <span className="viz-row-total">{row.median == null ? "No data yet" : days(row.median)}</span>
            </li>
          );
        })}
      </ul>
      <div className="viz-range-axis" aria-hidden="true">
        <span>0</span>
        <span>{Math.round(max / 2)} days</span>
        <span>{max} days</span>
      </div>
      {node}
    </div>
  );
}
