import { useState } from "react";
import { Legend, useChartTip } from "./chartKit.jsx";
import "./charts.css";

const WIDTH = 560;
const PAD = { left: 38, right: 78, top: 26, bottom: 30 };

/**
 * One or two lines over a run of points (applications per week, five academic years).
 *
 * `series` is [{ label, color, values, area?, emphasis? }]. Lines are 2px with 8px end-dots ringed in the
 * surface colour; the first series gets a faint area. Two or more series always get a legend, and each line
 * is also named at its right end. Hovering (or arrowing through the chart with the keyboard) snaps a vertical
 * guide to the nearest point and lists every series there. `labels` names the x positions.
 */
export default function TrendLines({ series, labels, height = 220, unit = "", peakLabel = null, ariaLabel }) {
  const { wrapRef, show, showAt, hide, node } = useChartTip();
  const [active, setActive] = useState(null);
  const n = labels.length;
  if (n < 2) return null;

  const all = series.flatMap((s) => s.values);
  const top = Math.max(...all, 0);
  const step = top <= 10 ? 5 : top <= 100 ? 10 : 50;
  const max = Math.max(Math.ceil(top / step) * step, step);
  const x = (i) => PAD.left + (i * (WIDTH - PAD.left - PAD.right)) / (n - 1);
  const y = (v) => PAD.top + (1 - v / max) * (height - PAD.top - PAD.bottom);
  const ticks = [0, 0.5, 1].map((fraction) => Math.round(max * fraction));
  const every = n > 8 ? 2 : 1;
  const base = y(0);

  const first = series[0];
  const peak = peakLabel && top > 0 ? first.values.indexOf(Math.max(...first.values)) : -1;

  function content(index) {
    return {
      title: labels[index],
      rows: series.map((s) => ({ value: `${s.values[index].toLocaleString()}${unit}`, label: s.label, color: s.color })),
    };
  }

  function nearest(event) {
    const box = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - box.left) / box.width) * WIDTH;
    return Math.min(n - 1, Math.max(0, Math.round(((px - PAD.left) / (WIDTH - PAD.left - PAD.right)) * (n - 1))));
  }

  function move(event) {
    const index = nearest(event);
    setActive(index);
    show(event, content(index));
  }

  function key(event) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const index = Math.min(n - 1, Math.max(0, (active ?? (event.key === "ArrowRight" ? -1 : n)) + (event.key === "ArrowRight" ? 1 : -1)));
    setActive(index);
    const box = wrapRef.current.getBoundingClientRect();
    showAt({ getBoundingClientRect: () => ({ left: box.left + (x(index) / WIDTH) * box.width, top: box.top + (y(Math.max(...series.map((s) => s.values[index]))) / height) * box.height, width: 0 }) }, content(index));
  }

  function leave() {
    setActive(null);
    hide();
  }

  const summary = `${ariaLabel}. ${series.map((s) => `${s.label}: ${s.values.join(", ")}`).join(". ")}.`;

  return (
    <div ref={wrapRef} className="viz-wrap">
      {series.length > 1 ? <Legend items={series.map((s) => ({ label: s.label, color: s.color, line: true }))} /> : null}
      <svg
        className="viz-svg"
        viewBox={`0 0 ${WIDTH} ${height}`}
        role="img"
        aria-label={summary}
        tabIndex={0}
        onPointerMove={move}
        onPointerLeave={leave}
        onKeyDown={key}
        onBlur={leave}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line className={tick === 0 ? "viz-axis" : "viz-grid"} x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} />
            <text x={PAD.left - 8} y={y(tick) + 4} textAnchor="end">
              {tick.toLocaleString()}
            </text>
          </g>
        ))}

        {labels.map((label, i) =>
          i % every === 0 || i === n - 1 ? (
            <text key={label} x={x(i)} y={height - 8} textAnchor="middle">
              {label}
            </text>
          ) : null,
        )}

        {series.map((s, si) => {
          const points = s.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
          const lastIndex = n - 1;
          return (
            <g key={s.label}>
              {si === 0 ? <path className="viz-area" fill={s.color} d={`M${x(0)},${base} L${points.join(" L")} L${x(lastIndex)},${base} Z`} /> : null}
              <path className="viz-line" pathLength="1" stroke={s.color} d={`M${points.join(" L")}`} />
              <circle className="viz-dot" cx={x(lastIndex)} cy={y(s.values[lastIndex])} r="5" fill={s.color} />
              <text className="viz-strong" x={x(lastIndex) + 10} y={y(s.values[lastIndex]) + 4}>
                {s.values[lastIndex].toLocaleString()} {series.length > 1 ? s.label : ""}
              </text>
            </g>
          );
        })}

        {peak >= 0 && peak !== n - 1 ? (
          <g>
            <circle className="viz-dot" cx={x(peak)} cy={y(first.values[peak])} r="5" fill="var(--viz-highlight)" />
            <text className="viz-strong" x={x(peak)} y={y(first.values[peak]) - 12} textAnchor={peak === 0 ? "start" : "middle"}>
              {first.values[peak].toLocaleString()} {peakLabel}
            </text>
          </g>
        ) : null}

        {active !== null ? (
          <g pointerEvents="none">
            <line className="viz-crosshair" x1={x(active)} x2={x(active)} y1={PAD.top} y2={base} />
            {series.map((s) => (
              <circle key={s.label} className="viz-dot" cx={x(active)} cy={y(s.values[active])} r="5" fill={s.color} />
            ))}
          </g>
        ) : null}
      </svg>
      {node}
    </div>
  );
}
