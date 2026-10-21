import "./charts.css";

/**
 * A tiny trend with no axes, for a headline figure: a 2px line, the earlier points in the context gray and the
 * latest point as a ringed dot in the main colour. `values` may include nulls (a year with nothing to measure);
 * those are skipped. `label` is spoken in place of the picture.
 */
export default function Sparkline({ values, label, width = 112, height = 32 }) {
  const known = values.map((value, index) => ({ value, index })).filter((point) => point.value != null);
  if (known.length < 2) return null;

  const lo = Math.min(...known.map((p) => p.value));
  const hi = Math.max(...known.map((p) => p.value));
  const span = hi - lo || 1;
  const x = (i) => 6 + (i * (width - 12)) / (values.length - 1);
  const y = (v) => 6 + (1 - (v - lo) / span) * (height - 12);
  const last = known[known.length - 1];

  return (
    <svg className="viz-spark viz-wrap" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <polyline fill="none" stroke="var(--viz-context)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={known.map((p) => `${x(p.index)},${y(p.value)}`).join(" ")} />
      <circle cx={x(last.index)} cy={y(last.value)} r="4.5" fill="var(--viz-main)" stroke="var(--color-surface)" strokeWidth="2" />
    </svg>
  );
}
