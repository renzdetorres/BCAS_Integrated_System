import "./Card.css";

export function Card({ children, className = "", ...rest }) {
  return (
    <div className={`ui-card ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

/**
 * Dashboard stat tile. `trend` is optional and only rendered when the caller
 * has a real comparison value to show (e.g. a delta computed from real API
 * data) - never a placeholder.
 */
export function StatCard({ label, value, icon, trend }) {
  return (
    <Card className="ui-stat-card">
      <div className="ui-stat-card-top">
        <span className="ui-stat-card-label">{label}</span>
        {icon ? <span className="ui-stat-card-icon">{icon}</span> : null}
      </div>
      <div className="ui-stat-card-value">{value}</div>
      {trend ? <div className="ui-stat-card-trend">{trend}</div> : null}
    </Card>
  );
}

export default Card;
