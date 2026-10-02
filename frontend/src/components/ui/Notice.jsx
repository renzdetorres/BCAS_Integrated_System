import Icon from "./Icon.jsx";
import "./Notice.css";

const ICON_BY_TONE = { info: "clock", warning: "lock", danger: "alert", success: "check" };

/** An inline banner for a condition that applies to the whole view (a lock, a closed period). */
export default function Notice({ tone = "info", title, children }) {
  return (
    <div className={`ui-notice ui-notice-${tone}`} role="status">
      <Icon name={ICON_BY_TONE[tone] ?? "clock"} size={18} className="ui-notice-icon" />
      <div className="ui-notice-body">
        {title ? <p className="ui-notice-title">{title}</p> : null}
        {children ? <div className="ui-notice-text">{children}</div> : null}
      </div>
    </div>
  );
}
