import { useChartTip } from "./chartKit.jsx";
import "./charts.css";

const WIDTH = 560;
const HEIGHT = 210;
const PAD = { left: 30, right: 12, top: 26, bottom: 34 };

/**
 * How a measure is spread: contiguous bins (two-pixel gaps) from 0 to `total`, with a marked line where a
 * pass begins. Bins at or above the line are the main colour and those below are the context gray, so the
 * chart reads as "who is on which side" without a legend. `bins` is [{ from, to, count }].
 */
export default function Histogram({ bins, total, passMark, ariaLabel }) {
  const { wrapRef, show, showAt, hide, node } = useChartTip();
  const top = Math.max(...bins.map((bin) => bin.count), 1);
  const max = Math.max(Math.ceil(top / 5) * 5, 5);
  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (value) => PAD.left + (value / total) * plotW;
  const y = (count) => PAD.top + (1 - count / max) * plotH;
  const ticks = [0, 0.5, 1].map((fraction) => Math.round(max * fraction));
  const content = (bin) => ({
    title: `Score ${bin.from} to ${bin.to}`,
    rows: [{ value: bin.count.toLocaleString(), label: bin.count === 1 ? "applicant" : "applicants" }],
  });

  return (
    <div ref={wrapRef} className="viz-wrap" onPointerLeave={hide}>
      <svg className="viz-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`${ariaLabel}. ${bins.map((bin) => `${bin.from} to ${bin.to}: ${bin.count}`).join("; ")}.`}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line className={tick === 0 ? "viz-axis" : "viz-grid"} x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} />
            <text x={PAD.left - 8} y={y(tick) + 4} textAnchor="end">
              {tick}
            </text>
          </g>
        ))}

        {bins.map((bin) => {
          const height = Math.max(y(0) - y(bin.count), bin.count > 0 ? 2 : 0);
          const passes = bin.to > passMark;
          return (
            <g key={bin.from}>
              <path
                d={`M${x(bin.from) + 1},${y(0)} v${-Math.max(height - 4, 0)} q0,-4 4,-4 h${x(bin.to) - x(bin.from) - 10} q4,0 4,4 v${Math.max(height - 4, 0)} z`}
                fill={passes ? "var(--viz-main)" : "var(--viz-context)"}
              />
              <rect
                x={x(bin.from)}
                y={PAD.top}
                width={x(bin.to) - x(bin.from)}
                height={plotH}
                fill="transparent"
                tabIndex={0}
                aria-label={`Score ${bin.from} to ${bin.to}: ${bin.count} applicants`}
                onPointerMove={(event) => show(event, content(bin))}
                onFocus={(event) => showAt(event.currentTarget, content(bin))}
                onBlur={hide}
              />
              {bin.count > 0 ? (
                <text className="viz-strong" x={(x(bin.from) + x(bin.to)) / 2} y={y(bin.count) - 6} textAnchor="middle">
                  {bin.count}
                </text>
              ) : null}
            </g>
          );
        })}

        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
          <text key={fraction} x={x(total * fraction)} y={HEIGHT - 12} textAnchor="middle">
            {Math.round(total * fraction)}
          </text>
        ))}

        <line className="viz-crosshair" x1={x(passMark)} x2={x(passMark)} y1={PAD.top - 4} y2={y(0)} strokeDasharray="0" />
        <text className="viz-strong" x={x(passMark)} y={PAD.top - 10} textAnchor="middle">
          Pass at {passMark}
        </text>
      </svg>
      {node}
    </div>
  );
}
