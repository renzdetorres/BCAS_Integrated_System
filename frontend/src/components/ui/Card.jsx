import "./Card.css";

/**
 * The base container, with four documented tiers - a page picks the tier
 * that matches what the content actually is, not "card" as one flat default:
 *   - "section" (default): a titled section of a page - Card(H2) + content.
 *   - "data": wraps a table/dense list a staff member scans repeatedly -
 *     flush border and a top rule instead of a floating shadow.
 *   - "action": something the viewer is meant to act on now - gold top rule,
 *     same family as the sidebar's active-state gold.
 *   - "summary": a compact figure/stat, not prose - see StatCard below.
 */
export function Card({ tier = "section", children, className = "", ...rest }) {
  return (
    <div className={`ui-card ui-card--${tier} ${className}`.trim()} {...rest}>
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
    <Card tier="summary" className="ui-stat-card">
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
