import "./Skeleton.css";

const LINE_WIDTHS = ["92%", "78%", "86%", "64%", "72%"];

/**
 * Placeholder shaped like what is loading, so the page does not jump when the data arrives
 * (the replacement is the same height, give or take a row) and nobody stares at the word "Loading".
 *
 *   lines     a heading and a few text lines (the default; cards, notes, details)
 *   table     a header row and `rows` data rows (lists and reports)
 *   dashboard three figure tiles and a few lines (each role's home screen)
 *   form      a few label + field pairs (settings and profile forms)
 */
export default function Skeleton({ variant = "lines", rows = 5, className = "" }) {
  return (
    <div className={`ui-skeleton ui-skeleton-${variant} ${className}`.trim()} role="status" aria-busy="true">
      <span className="visually-hidden">Loading</span>
      <div className="ui-skeleton-body" aria-hidden="true">
        {variant === "dashboard" ? (
          <div className="ui-skeleton-tiles">
            {[0, 1, 2].map((tile) => (
              <div key={tile} className="ui-skeleton-tile">
                <span className="ui-skeleton-bar" style={{ width: "48%" }} />
                <span className="ui-skeleton-bar ui-skeleton-bar-lg" style={{ width: "34%" }} />
              </div>
            ))}
          </div>
        ) : null}

        {variant === "table" ? (
          <div className="ui-skeleton-table">
            <div className="ui-skeleton-row ui-skeleton-row-head">
              {[0, 1, 2, 3].map((cell) => (
                <span key={cell} className="ui-skeleton-bar" style={{ width: "58%" }} />
              ))}
            </div>
            {Array.from({ length: rows }, (_, row) => (
              <div key={row} className="ui-skeleton-row">
                {[0, 1, 2, 3].map((cell) => (
                  <span key={cell} className="ui-skeleton-bar" style={{ width: `${LINE_WIDTHS[(row + cell) % LINE_WIDTHS.length]}` }} />
                ))}
              </div>
            ))}
          </div>
        ) : null}

        {variant === "form" ? (
          <div className="ui-skeleton-form">
            {[0, 1, 2].map((field) => (
              <div key={field} className="ui-skeleton-field">
                <span className="ui-skeleton-bar" style={{ width: "22%" }} />
                <span className="ui-skeleton-bar ui-skeleton-input" />
              </div>
            ))}
          </div>
        ) : null}

        {variant === "lines" || variant === "dashboard" ? (
          <div className="ui-skeleton-lines">
            {variant === "lines" ? <span className="ui-skeleton-bar ui-skeleton-bar-lg" style={{ width: "38%" }} /> : null}
            {LINE_WIDTHS.slice(0, variant === "lines" ? 4 : 3).map((width, index) => (
              <span key={index} className="ui-skeleton-bar" style={{ width }} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
