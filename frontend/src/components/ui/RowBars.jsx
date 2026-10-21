import "./RowBars.css";

/**
 * Labelled horizontal rows, for measures that are lengths of time or shares (how many days a step
 * takes, how often a document is sent back). The row's number is always written out, so the bar
 * only adds comparison. `items` is [{ label, value, text, highlight }]; a null value shows `text`
 * with no bar. `max` fixes the scale (for example 100 for percentages); by default it is the largest value.
 */
export default function RowBars({ items, max, label }) {
  const scale = max ?? Math.max(...items.map((item) => item.value ?? 0), 1);

  return (
    <ul className="ui-rowbars" aria-label={label}>
      {items.map((item) => (
        <li key={item.label} className="ui-rowbars-row">
          <span className="ui-rowbars-name">{item.label}</span>
          <span className={`ui-rowbars-track${item.highlight ? " is-highlight" : ""}`} aria-hidden="true">
            {item.value != null ? <span className="ui-rowbars-fill" style={{ width: `${Math.min(100, Math.max((item.value / scale) * 100, item.value > 0 ? 2 : 0))}%` }} /> : null}
          </span>
          <span className="ui-rowbars-value">{item.text}</span>
        </li>
      ))}
    </ul>
  );
}
