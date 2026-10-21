import { Legend, useChartTip } from "./chartKit.jsx";
import "./charts.css";

/**
 * Part-to-whole as horizontal bars: one row per group, each cut into segments that share the row's width
 * (two-pixel gaps, not borders). `rows` is [{ label, total?, segments: [{ label, value, color }] }]; `total`
 * is the figure written at the right end. The legend always names the segments, and every segment is a hover
 * and keyboard target. Zero-width segments are left out.
 */
export default function StackedRows({ rows, legend, ariaLabel }) {
  const { wrapRef, show, showAt, hide, node } = useChartTip();

  return (
    <div ref={wrapRef} className="viz-wrap" onPointerLeave={hide}>
      {legend ? <Legend items={legend} /> : null}
      <ul className="viz-rows" aria-label={ariaLabel}>
        {rows.map((row) => {
          const sum = row.segments.reduce((a, s) => a + s.value, 0);
          return (
            <li key={row.label} className="viz-row">
              <span className="viz-row-name">{row.label}</span>
              <div className="viz-stack" role="img" aria-label={`${row.label}: ${row.segments.map((s) => `${s.label} ${s.value}`).join(", ")}`}>
                {row.segments
                  .filter((segment) => segment.value > 0)
                  .map((segment, index) => {
                    const content = {
                      title: row.label,
                      rows: [{ value: `${segment.value.toLocaleString()} (${sum ? Math.round((segment.value / sum) * 100) : 0}%)`, label: segment.label, color: segment.color }],
                    };
                    return (
                      <span
                        key={segment.label}
                        className="viz-seg"
                        tabIndex={0}
                        style={{ flexGrow: segment.value, background: segment.color, animationDelay: `${index * 60}ms` }}
                        onPointerMove={(event) => show(event, content)}
                        onFocus={(event) => showAt(event.currentTarget, content)}
                        onBlur={hide}
                      />
                    );
                  })}
              </div>
              <span className="viz-row-total">{row.total ?? sum.toLocaleString()}</span>
            </li>
          );
        })}
      </ul>
      {node}
    </div>
  );
}
