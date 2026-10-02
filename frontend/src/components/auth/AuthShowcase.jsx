import BcasSeal from "../ui/BcasSeal.jsx";
import "./AuthShowcase.css";

export default function AuthShowcase() {
  return (
    <section className="auth-showcase">
      <div className="auth-showcase-overlay" aria-hidden="true" />
      <div className="auth-showcase-brand">
        <BcasSeal size={44} />
        <div className="auth-showcase-brand-text">
          <span className="auth-showcase-mark">BCAS</span>
          <span className="auth-showcase-tagline">Scholarship &amp; Admissions</span>
        </div>
      </div>
      <div className="auth-showcase-footer">
        <p className="auth-showcase-motto">&ldquo;To climb the mountain, to kiss the cloud.&rdquo;</p>
        <p className="auth-showcase-est">
          Integrated Scholarship &amp; Admissions Application and Screening System. Serving students and their
          families since 2000.
        </p>
      </div>
    </section>
  );
}
