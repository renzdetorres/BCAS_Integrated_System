import "./BarChart.css";

/** A round tick step (1, 2, 2.5, 5 x 10^n) and the axis max that clears the largest value. */
function niceScale(maxValue, targetTicks = 4) {
  if (maxValue <= 0) return { max: targetTicks, step: 1 };
  const rawStep = maxValue / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((candidate) => candidate >= rawStep);
  const niceStep = step < 1 ? 1 : Number.isInteger(step) ? step : Math.ceil(step);
  return { max: Math.ceil(maxValue / niceStep) * niceStep, step: niceStep };
}

/**
 * Single-series horizontal bar graph with a value axis. One colour - the
 * panel title says what's plotted, so no legend. Horizontal because the
 * category labels (programs, scholarships) are long and must stay readable
 * without rotating text. `caption` names the data table screen readers get.
 */
export default function BarChart({
  data,
  valueFormatter = (v) => v.toLocaleString(),
  emptyMessage = "No data yet.",
  caption = "Chart data",
  unit = "",
}) {
  if (!data || data.length === 0) {
    return <p className="ui-barchart-empty">{emptyMessage}</p>;
  }

  const { max, step } = niceScale(Math.max(...data.map((d) => d.value)));
  const ticks = Array.from({ length: max / step + 1 }, (_, i) => i * step);

  return (
    <figure className="ui-barchart">
      <div className="ui-barchart-plot" aria-hidden="true">
        {data.map((d, index) => (
          <div className="ui-barchart-row" key={d.label} title={`${d.label}: ${valueFormatter(d.value)}${unit ? ` ${unit}` : ""}`}>
            <span className="ui-barchart-label">{d.label}</span>
            <div className="ui-barchart-track">
              {ticks.map((tick) => (
                <span key={tick} className="ui-barchart-gridline" style={{ left: `${(tick / max) * 100}%` }} />
              ))}
              <div
                className="ui-barchart-fill"
                style={{ width: `${(d.value / max) * 100}%`, "--bar-index": index }}
              />
              <span className="ui-barchart-value" style={{ left: `${(d.value / max) * 100}%` }}>
                {valueFormatter(d.value)}
              </span>
            </div>
          </div>
        ))}
        <div className="ui-barchart-row ui-barchart-axis-row">
          <span />
          <div className="ui-barchart-axis">
            {ticks.map((tick) => (
              <span key={tick} style={{ left: `${(tick / max) * 100}%` }}>
                {valueFormatter(tick)}
              </span>
            ))}
          </div>
        </div>
      </div>
      <table className="visually-hidden">
        <caption>{caption}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{valueFormatter(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
