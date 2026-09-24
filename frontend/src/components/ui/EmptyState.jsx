import Icon from "./Icon.jsx";
import "./EmptyState.css";

/**
 * Replaces the bare one-line "No X yet." paragraphs scattered across list
 * and detail pages with a consistent, slightly more legible treatment -
 * an icon, a short title, an optional explanatory line, and an optional
 * action (usually a Link to where the user should go instead). Purely
 * presentational: callers still decide the actual condition and copy.
 */
export default function EmptyState({ icon = "folder", title, message, action }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon" aria-hidden="true">
        <Icon name={icon} size={26} />
      </span>
      {title ? <p className="empty-state-title">{title}</p> : null}
      {message ? <p className="empty-state-message">{message}</p> : null}
      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  );
}
