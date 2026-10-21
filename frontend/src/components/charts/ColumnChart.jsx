import { useChartTip } from "./chartKit.jsx";
import "./charts.css";

/**
 * Thin vertical columns grown from a baseline, for comparing a few labelled magnitudes (the funnel).
 * `items` is [{ label, value, text?, note?, tone? }]: `text` is what is written on the cap when it should
 * differ from the number (a percentage), `note` is a small line under the name, and tone "highlight" paints
 * the one column worth a look in the accent while the rest stay in the main colour. `max` fixes the scale.
 * Each column is a hover and keyboard target with the same readout.
 */
export default function ColumnChart({ items, max, unit = "", ariaLabel }) {
  const { wrapRef, show, showAt, hide, node } = useChartTip();
  const top = max ?? Math.max(...items.map((item) => item.value), 1);
  const shown = (item) => item.text ?? item.value.toLocaleString();
  const tip = (item) => ({ title: item.label, rows: [{ value: `${shown(item)}${unit}`, label: item.note ?? "" }] });

  return (
    <div ref={wrapRef} className="viz-wrap" onPointerLeave={hide}>
      <div className="viz-cols" style={{ "--n": items.length }} role="list" aria-label={ariaLabel}>
        {items.map((item, index) => (
          <div
            key={item.label}
            className="viz-col"
            role="listitem"
            tabIndex={0}
            aria-label={`${item.label}: ${shown(item)}${unit}${item.note ? `, ${item.note}` : ""}`}
            style={{ "--i": index }}
            onPointerMove={(event) => show(event, tip(item))}
            onFocus={(event) => showAt(event.currentTarget.querySelector(".viz-bar") ?? event.currentTarget, tip(item))}
            onBlur={hide}
          >
            <div className="viz-well">
              <div
                className={`viz-bar${item.tone ? ` is-${item.tone}` : ""}`}
                style={{ height: `${Math.max((item.value / top) * 100, item.value > 0 ? 3 : 0)}%` }}
              >
                <span className="viz-bar-value">{shown(item)}</span>
              </div>
            </div>
            <span className="viz-col-name">{item.label}</span>
            {item.note ? <span className="viz-col-note">{item.note}</span> : null}
          </div>
        ))}
      </div>
      {node}
    </div>
  );
}
