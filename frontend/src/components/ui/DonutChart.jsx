import "./DonutChart.css";

const SIZE = 148;
const STROKE = 24;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 3;

/**
 * Status/part-to-whole donut. Segment identity never rides on color alone -
 * every segment has a direct, always-visible label + value in the legend
 * list beside it (not a hover-only tooltip), the same "never color-alone"
 * rule StatusBadge already follows everywhere else in this app.
 */
export default function DonutChart({ segments, centerLabel = "Total", valueFormatter = (v) => v.toLocaleString() }) {
  const total = segments.reduce((sum, s) => sum + Math.max(s.value, 0), 0);

  let cumulative = 0;
  const arcs = segments.map((segment) => {
    const value = Math.max(segment.value, 0);
    const length = total > 0 ? (value / total) * CIRCUMFERENCE : 0;
    const dash = Math.max(length - GAP, 0);
    const offset = -cumulative;
    cumulative += length;
    return { ...segment, dash, offset };
  });

  return (
    <div className="ui-donutchart">
      <svg
        className="ui-donutchart-svg"
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`${centerLabel}: ${total.toLocaleString()}, split ${segments
          .map((s) => `${s.label} ${s.value}`)
          .join(", ")}`}
      >
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--color-bg)" strokeWidth={STROKE} />
          {total > 0 &&
            arcs.map((arc) => (
              <circle
                key={arc.label}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={arc.color}
                strokeWidth={STROKE}
                strokeDasharray={`${arc.dash} ${CIRCUMFERENCE - arc.dash}`}
                strokeDashoffset={arc.offset}
              />
            ))}
        </g>
        <text x="50%" y="47%" textAnchor="middle" className="ui-donutchart-center-value">
          {total.toLocaleString()}
        </text>
        <text x="50%" y="62%" textAnchor="middle" className="ui-donutchart-center-label">
          {centerLabel}
        </text>
      </svg>

      <ul className="ui-donutchart-legend">
        {segments.map((segment) => (
          <li key={segment.label}>
            <span className="ui-donutchart-swatch" style={{ background: segment.color }} aria-hidden="true" />
            <span className="ui-donutchart-legend-label">{segment.label}</span>
            <span className="ui-donutchart-legend-value">{valueFormatter(segment.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
