import Icon from "./Icon.jsx";
import "./Button.css";

/**
 * The one button component every shared/base surface should use (ConfirmDialog,
 * Toast actions, TopBar, forms). Page-level bespoke buttons (row toggles, tab
 * pickers, etc.) aren't migrated here wholesale - this establishes the system
 * for shared chrome and new work, not a forced rewrite of every page.
 *
 * `tone`: primary (forest, the one default action) | secondary (outlined,
 * co-equal or cancel actions) | danger (destructive confirms) | ghost (quiet,
 * inline, e.g. "View all").
 *
 * A button answers in three beats: the press (a small squeeze, from base.css), the wait
 * (`loading`: a spinner, the button holds still and refuses a second click) and the result
 * (`done`: a check). Neither is on by default.
 */
export default function Button({
  tone = "primary",
  size = "md",
  as: Component = "button",
  className = "",
  loading = false,
  done = false,
  disabled,
  children,
  ...rest
}) {
  const state = loading ? " is-loading" : done ? " is-done" : "";
  return (
    <Component
      className={`ui-button ui-button-${tone} ui-button-${size}${state} ${className}`.trim()}
      disabled={loading ? true : disabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="ui-button-spinner" aria-hidden="true" /> : null}
      {done && !loading ? <Icon name="check" size={16} className="ui-button-check" /> : null}
      {children}
    </Component>
  );
}
