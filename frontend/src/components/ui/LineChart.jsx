import "./LineChart.css";

const WIDTH = 560;
const HEIGHT = 200;
const PAD_LEFT = 34;
const PAD_RIGHT = 8;
const PAD_TOP = 12;
const PAD_BOTTOM = 26;

/**
 * Multi-series trend line. Built for a handful of monthly points per
 * series (applications received, documents verified, etc.) - not a
 * general-purpose charting surface. Each series needs a direct label in
 * the legend (never color-alone identity, the same rule DonutChart and
 * StatusBadge already follow). Hand-rolled SVG, no charting library, to
 * match BarChart/DonutChart's existing craft in this app.
 */
export default function LineChart({ categories, series, valueFormatter = (v) => v.toLocaleString() }) {
  if (!categories || categories.length === 0 || !series || series.length === 0) {
    return <p className="ui-linechart-empty">No data yet.</p>;
  }

  const allValues = series.flatMap((s) => s.values);
  const maxValue = Math.max(...allValues, 1);
  const niceMax = Math.ceil(maxValue / 10) * 10 || 10;

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const stepX = categories.length > 1 ? plotWidth / (categories.length - 1) : 0;

  function xAt(index) {
    return PAD_LEFT + stepX * index;
  }
  function yAt(value) {
    return PAD_TOP + plotHeight - (value / niceMax) * plotHeight;
  }

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="ui-linechart">
      <svg
        className="ui-linechart-svg"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={series.map((s) => `${s.label}: ${s.values.join(", ")}`).join(". ")}
      >
        {gridLines.map((fraction) => {
          const y = PAD_TOP + plotHeight * (1 - fraction);
          return (
            <g key={fraction}>
              <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={y} y2={y} className="ui-linechart-gridline" />
              <text x={PAD_LEFT - 8} y={y + 3} className="ui-linechart-axis-label" textAnchor="end">
                {Math.round(niceMax * fraction)}
              </text>
            </g>
          );
        })}

        {categories.map((label, index) => (
          <text
            key={label}
            x={xAt(index)}
            y={HEIGHT - 8}
            className="ui-linechart-axis-label"
            textAnchor="middle"
          >
            {label}
          </text>
        ))}

        {series.map((s) => {
          const points = s.values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" ");
          return (
            <g key={s.label}>
              <polyline points={points} fill="none" stroke={s.color} strokeWidth="2.5" />
              {s.values.map((v, i) => (
                <circle key={i} cx={xAt(i)} cy={yAt(v)} r="3" fill={s.color} />
              ))}
            </g>
          );
        })}
      </svg>

      <ul className="ui-linechart-legend">
        {series.map((s) => (
          <li key={s.label}>
            <span className="ui-linechart-swatch" style={{ background: s.color }} aria-hidden="true" />
            <span className="ui-linechart-legend-label">{s.label}</span>
            <span className="ui-linechart-legend-value">
              {valueFormatter(s.values[s.values.length - 1])} this month
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
