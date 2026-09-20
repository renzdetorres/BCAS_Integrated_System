import Icon from "../ui/Icon.jsx";
import "./AuthShowcase.css";

export default function AuthShowcase() {
  return (
    <section className="auth-showcase">
      <div className="auth-showcase-overlay" aria-hidden="true" />
      <div className="auth-showcase-brand">
        <span className="auth-showcase-mark">
          <Icon name="graduation-cap" size={26} />
          BCAS
        </span>
        <p className="auth-showcase-tagline">
          Integrated Scholarship &amp; Admissions Application and Screening System
        </p>
      </div>
    </section>
  );
}
