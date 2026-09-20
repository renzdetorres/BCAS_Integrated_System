import "./BarChart.css";

/**
 * Single-series horizontal bar chart (one color - the title/caption already
 * says what's plotted, so no legend box). Built for short category lists
 * (programs, scholarship types) where the label itself needs room to read,
 * which a horizontal layout gives for free without rotating text.
 */
export default function BarChart({ data, valueFormatter = (v) => v.toLocaleString(), emptyMessage = "No data yet." }) {
  if (!data || data.length === 0) {
    return <p className="ui-barchart-empty">{emptyMessage}</p>;
  }

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="ui-barchart">
      {data.map((d) => (
        <div className="ui-barchart-row" key={d.label}>
          <span className="ui-barchart-label">{d.label}</span>
          <div className="ui-barchart-track">
            <div className="ui-barchart-fill" style={{ width: `${Math.max((d.value / max) * 100, d.value > 0 ? 2 : 0)}%` }} />
          </div>
          <span className="ui-barchart-value">{valueFormatter(d.value)}</span>
        </div>
      ))}
    </div>
  );
}
