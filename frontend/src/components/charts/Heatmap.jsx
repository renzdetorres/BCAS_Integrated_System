import { useChartTip } from "./chartKit.jsx";
import "./charts.css";

const STEPS = 5;

/**
 * A grid of counts shaded in one green from light to dark (more is darker), for patterns across two
 * categories at once. `rows` is the row labels, `columns` the column labels, `values[r][c]` the counts,
 * and `noun` names what is counted ("application"). A zero is a plain, outlined cell, so "none" never reads
 * as "a little". The count is written in the cell, and each cell is a hover and keyboard target.
 */
export default function Heatmap({ rows, columns, values, noun = "application", ariaLabel }) {
  const { wrapRef, show, showAt, hide, node } = useChartTip();
  const max = Math.max(...values.flat(), 1);
  const stepOf = (value) => (value === 0 ? 0 : Math.min(STEPS, 1 + Math.floor((value / max) * (STEPS - 0.001))));

  return (
    <div ref={wrapRef} className="viz-wrap" onPointerLeave={hide}>
      <div className="viz-heat" style={{ "--cols": columns.length }} role="table" aria-label={ariaLabel}>
        <span />
        {columns.map((column) => (
          <span key={column} className="viz-heat-head" role="columnheader">
            {column}
          </span>
        ))}
        {rows.map((row, r) => (
          <div key={row} style={{ display: "contents" }} role="row">
            <span className="viz-heat-day" role="rowheader">
              {row}
            </span>
            {columns.map((column, c) => {
              const value = values[r][c];
              const content = { title: `${row}, ${column}`, rows: [{ value: value.toLocaleString(), label: value === 1 ? noun : `${noun}s` }] };
              return (
                <span
                  key={column}
                  className="viz-cell"
                  role="cell"
                  tabIndex={0}
                  data-step={stepOf(value)}
                  aria-label={`${row}, ${column}: ${value} ${value === 1 ? noun : `${noun}s`}`}
                  onPointerMove={(event) => show(event, content)}
                  onFocus={(event) => showAt(event.currentTarget, content)}
                  onBlur={hide}
                >
                  {value > 0 ? value : ""}
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <div className="viz-scale" aria-hidden="true">
        <span>Fewer</span>
        {[1, 2, 3, 4, 5].map((step) => (
          <i key={step} style={{ background: `var(--viz-heat-${step})` }} />
        ))}
        <span>More</span>
      </div>
      {node}
    </div>
  );
}
