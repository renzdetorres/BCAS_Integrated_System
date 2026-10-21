import { Link } from "react-router-dom";
import "./FigureBars.css";

/**
 * Vertical bar graph of a few labelled counts, scaled to the largest one.
 * Every bar carries its number above it and its name below it, so the value
 * never depends on bar height or colour alone.
 *
 * A figure may carry `text` (what is written above the bar when it should differ from the number,
 * such as "83%"), `max` on the component fixes the scale instead of using the tallest bar (100 for
 * percentages), and a figure may carry `to` (the whole column becomes a link) and `note`
 * (a small line under the name, e.g. a percentage). With links the graph is a
 * real list of links rather than one described image, so they stay reachable.
 */
export default function FigureBars({ figures, label = "Summary as a bar graph", max: fixedMax }) {
  const max = fixedMax ?? Math.max(...figures.map((figure) => figure.value), 1);
  const linked = figures.some((figure) => figure.to);
  const shown = (figure) => figure.text ?? figure.value.toLocaleString();
  const spoken = (figure) => `${figure.label} ${shown(figure)}${figure.note ? `, ${figure.note}` : ""}`;

  const column = (figure) => (
    <>
      <div className="ui-figurebars-well">
        <div className="ui-figurebars-fill" style={{ height: `${Math.max((figure.value / max) * 100, figure.value > 0 ? 3 : 0)}%` }}>
          <span className="ui-figurebars-value">{shown(figure)}</span>
          <span className="ui-figurebars-bar" />
        </div>
      </div>
      <span className="ui-figurebars-label">{figure.label}</span>
      {figure.note ? <span className="ui-figurebars-note">{figure.note}</span> : null}
    </>
  );

  return (
    <div className="ui-figurebars" role={linked ? undefined : "img"} aria-label={linked ? undefined : `${label}: ${figures.map(spoken).join(", ")}`}>
      <ul className="ui-figurebars-plot" style={{ "--bar-count": figures.length }} aria-hidden={linked ? undefined : "true"} aria-label={linked ? label : undefined}>
        {figures.map((figure, index) => (
          <li key={figure.label} className="ui-figurebars-column" style={{ "--bar-index": index }}>
            {figure.to ? (
              <Link to={figure.to} className="ui-figurebars-link" aria-label={spoken(figure)}>
                {column(figure)}
              </Link>
            ) : (
              column(figure)
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
