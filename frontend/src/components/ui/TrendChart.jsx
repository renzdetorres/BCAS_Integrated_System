import "./TrendChart.css";

/**
 * Multi-series grouped vertical bar chart for a short weekly time series.
 * Every series has a legend swatch + label (not a hover-only tooltip),
 * matching DonutChart/StatusBadge's "never color-alone" rule elsewhere in
 * this app.
 */
export default function TrendChart({ data, series, valueFormatter = (v) => v.toLocaleString(), emptyMessage = "No data yet." }) {
  if (!data || data.length === 0) {
    return <p className="ui-trendchart-empty">{emptyMessage}</p>;
  }

  const max = Math.max(...data.flatMap((point) => series.map((s) => point.values[s.key] ?? 0)), 1);

  return (
    <div className="ui-trendchart">
      <ul className="ui-trendchart-legend">
        {series.map((s) => (
          <li key={s.key}>
            <span className="ui-trendchart-swatch" style={{ background: s.color }} aria-hidden="true" />
            {s.label}
          </li>
        ))}
      </ul>

      <div className="ui-trendchart-plot">
        {data.map((point) => (
          <div className="ui-trendchart-column" key={point.label}>
            <div className="ui-trendchart-bars">
              {series.map((s) => {
                const value = point.values[s.key] ?? 0;
                return (
                  <div
                    key={s.key}
                    className="ui-trendchart-bar"
                    style={{ height: `${Math.max((value / max) * 100, value > 0 ? 3 : 0)}%`, background: s.color }}
                    title={`${s.label}: ${valueFormatter(value)}`}
                  />
                );
              })}
            </div>
            <span className="ui-trendchart-label">{point.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
