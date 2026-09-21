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
 */
export default function Button({
  tone = "primary",
  size = "md",
  as: Component = "button",
  className = "",
  children,
  ...rest
}) {
  return (
    <Component className={`ui-button ui-button-${tone} ui-button-${size} ${className}`.trim()} {...rest}>
      {children}
    </Component>
  );
}
