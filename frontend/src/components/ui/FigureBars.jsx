import "./FigureBars.css";

/**
 * Vertical bar graph of a few labelled counts, scaled to the largest one.
 * Every bar carries its number above it and its name below it, so the value
 * never depends on bar height or colour alone.
 */
export default function FigureBars({ figures, label = "Summary as a bar graph" }) {
  const max = Math.max(...figures.map((figure) => figure.value), 1);

  return (
    <div className="ui-figurebars" role="img" aria-label={`${label}: ${figures.map((figure) => `${figure.label} ${figure.value}`).join(", ")}`}>
      <ul className="ui-figurebars-plot" style={{ "--bar-count": figures.length }} aria-hidden="true">
        {figures.map((figure, index) => (
          <li key={figure.label} className="ui-figurebars-column" style={{ "--bar-index": index }}>
            <div className="ui-figurebars-well">
              <div className="ui-figurebars-fill" style={{ height: `${Math.max((figure.value / max) * 100, figure.value > 0 ? 3 : 0)}%` }}>
                <span className="ui-figurebars-value">{figure.value.toLocaleString()}</span>
                <span className="ui-figurebars-bar" />
              </div>
            </div>
            <span className="ui-figurebars-label">{figure.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
