import "./ProgressBar.css";

/** `value`/`max` should come from real counts (e.g. documents verified / required, slots filled / total). */
export default function ProgressBar({ value, max, label }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;

  return (
    <div className="ui-progress">
      {label ? (
        <div className="ui-progress-label">
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
      ) : null}
      <div className="ui-progress-track">
        <div className="ui-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
