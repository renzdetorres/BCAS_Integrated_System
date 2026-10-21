import { useRef, useState } from "react";

/**
 * The hover layer every chart shares: one small readout that follows the pointer (or the focused mark),
 * values first and labels after, each series keyed by a short stroke of its colour. Labels come from
 * data, so they are only ever rendered as text, never as markup.
 *
 *   const { wrapRef, show, showAt, hide, node } = useChartTip();
 *   <div ref={wrapRef} className="viz-wrap" onPointerLeave={hide}> ... {node} </div>
 *   show(event, { title, rows: [{ value, label, color }] })      on pointer move
 *   showAt(element, content)                                      on keyboard focus
 */
export function useChartTip() {
  const wrapRef = useRef(null);
  const [tip, setTip] = useState(null);

  function place(x, y, content) {
    const width = wrapRef.current?.clientWidth ?? 0;
    // Keep the readout inside the chart: it is about 220px wide and centred on x.
    setTip({ x: Math.min(Math.max(x, 110), Math.max(width - 110, 110)), y, content });
  }

  function show(event, content) {
    const box = wrapRef.current?.getBoundingClientRect();
    if (box) place(event.clientX - box.left, event.clientY - box.top, content);
  }

  function showAt(element, content) {
    const box = wrapRef.current?.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    if (box) place(rect.left - box.left + rect.width / 2, rect.top - box.top, content);
  }

  const node = tip ? (
    <div className="viz-tip" style={{ left: tip.x, top: tip.y }} role="presentation">
      {tip.content.title ? <div className="viz-tip-title">{tip.content.title}</div> : null}
      {tip.content.rows.map((row, index) => (
        <div className="viz-tip-row" key={index}>
          {row.color ? <span className="viz-tip-key" style={{ background: row.color }} /> : null}
          <b>{row.value}</b>
          <span>{row.label}</span>
        </div>
      ))}
    </div>
  ) : null;

  return { wrapRef, show, showAt, hide: () => setTip(null), node };
}

/** A legend that always names every series: a swatch (or a line key) and the words. */
export function Legend({ items }) {
  return (
    <ul className="viz-legend">
      {items.map((item) => (
        <li key={item.label}>
          <span className={`viz-swatch${item.line ? " is-line" : ""}${item.hollow ? " is-hollow" : ""}`} style={{ "--swatch": item.color }} aria-hidden="true" />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
