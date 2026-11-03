import BcasSeal from "../ui/BcasSeal.jsx";
import "./AuthShowcase.css";

export default function AuthShowcase() {
  return (
    <section className="auth-showcase">
      <div className="auth-showcase-brand">
        <BcasSeal size={72} />
        <div className="auth-showcase-brand-text">
          <span className="auth-showcase-mark">BCAS</span>
          <span className="auth-showcase-tagline">Scholarship &amp; Admissions</span>
        </div>
      </div>

      {/* Green hills over the lawn so the motto reads on any photo. */}
      <svg
        className="auth-showcase-hills"
        viewBox="0 0 800 420"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id="auth-hill-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1f5a3c" stopOpacity="0.9" />
            <stop offset="1" stopColor="#0f2f1e" stopOpacity="0.98" />
          </linearGradient>
        </defs>
        <path d="M0 150C170 70 380 60 560 140C660 184 740 204 800 196V420H0Z" fill="url(#auth-hill-fill)" stroke="rgba(255,255,255,0.16)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        <path d="M0 420V340C250 296 520 392 800 300V420Z" fill="#4fae72" opacity="0.42" />
      </svg>

      <div className="auth-showcase-footer">
        <p className="auth-showcase-motto">&ldquo;To climb the mountain, to kiss the cloud.&rdquo;</p>
        <p className="auth-showcase-est">
          <span>Integrated Scholarship &amp; Admissions Application and Screening System.</span>
          <span>Serving students and their families since 2000.</span>
        </p>
      </div>
    </section>
  );
}
