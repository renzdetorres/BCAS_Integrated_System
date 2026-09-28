import { Link } from "react-router-dom";
import Icon from "./Icon.jsx";
import "./NextActionBanner.css";

/** A single, prioritized call-to-action - what this role should do right now. */
export default function NextActionBanner({ text, to, cta }) {
  return (
    <div className="next-action-banner">
      <p>{text}</p>
      <Link className="next-action-button" to={to}>
        {cta}
        <Icon name="chevron" size={16} className="next-action-arrow" />
      </Link>
    </div>
  );
}
