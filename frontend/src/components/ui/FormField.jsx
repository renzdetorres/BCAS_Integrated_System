/**
 * Label + control + hint/error, the one shape every form field on shared
 * surfaces should take. `as` picks the control element ("input" default,
 * or "select"/"textarea"); anything else (icons, custom controls) should
 * compose the .ui-field/.ui-label/.ui-hint classes directly instead.
 */
export default function FormField({ label, id, hint, error, as: Control = "input", className = "", children, ...rest }) {
  const controlClass = Control === "select" ? "ui-select" : Control === "textarea" ? "ui-textarea" : "ui-input";

  return (
    <div className={`ui-field ${error ? "ui-field-error" : ""} ${className}`.trim()}>
      {label ? (
        <label className="ui-label" htmlFor={id}>
          {label}
        </label>
      ) : null}
      <Control id={id} className={controlClass} {...rest}>
        {children}
      </Control>
      {(error || hint) ? <p className="ui-hint">{error || hint}</p> : null}
    </div>
  );
}
