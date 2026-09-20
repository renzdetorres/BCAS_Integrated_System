import BcasSeal from "../ui/BcasSeal.jsx";
import "./AuthShowcase.css";

export default function AuthShowcase() {
  return (
    <section className="auth-showcase">
      <div className="auth-showcase-overlay" aria-hidden="true" />
      <div className="auth-showcase-brand">
        <BcasSeal size={52} />
        <div>
          <span className="auth-showcase-mark">BCAS</span>
          <p className="auth-showcase-tagline">
            Integrated Scholarship &amp; Admissions Application and Screening System
          </p>
        </div>
      </div>
      <p className="auth-showcase-motto">&ldquo;To climb the mountain, to kiss the cloud.&rdquo;</p>
      <p className="auth-showcase-est">Serving students and their families since 2000.</p>
    </section>
  );
}
