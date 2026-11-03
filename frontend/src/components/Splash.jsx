import { useEffect, useState } from "react";
import {
  BOOT_STEPS,
  bootPercent,
  bootStage,
  finishBootClock,
  startBootClock,
} from "../utils/bootProgress.js";
import "../styles/splash.css";

/**
 * The branded loading screen: the school seal with a turning gold arc, the system's name and a
 * progress line. It is the same markup and styles as the page's first-paint splash in index.html,
 * so opening the site shows one continuous screen. Shown while the session is checked and while a
 * page's code is fetched on a first visit; everything after that is covered by the top progress
 * line and skeletons.
 */
export default function Splash() {
  const [percent, setPercent] = useState(() => {
    startBootClock();
    return bootPercent();
  });

  useEffect(() => {
    const timer = setInterval(() => setPercent(bootPercent()), 120);
    return () => {
      clearInterval(timer);
      finishBootClock();
    };
  }, []);

  const stage = bootStage(percent);

  return (
    <div className="splash" role="status" aria-live="polite" aria-label="Loading Scholarship and Admissions">
      <div className="splash-topline" aria-hidden="true">
        <span className="splash-topline-fill" style={{ width: `${percent}%` }} />
      </div>

      <div className="splash-center">
        <div className="splash-seal" aria-hidden="true">
          <span className="splash-seal-halo" />
          <svg className="splash-seal-arc" viewBox="0 0 100 100" focusable="false">
            <circle className="splash-seal-ring" cx="50" cy="50" r="47" />
            <circle className="splash-seal-spin" cx="50" cy="50" r="47" pathLength="100" strokeDasharray="22 78" />
          </svg>
          <span className="splash-seal-disc">
            <img src="/images/bcas-logo.png" alt="" width="118" height="118" />
          </span>
        </div>

        <p className="splash-title">Scholarship and Admissions</p>
        <p className="splash-sub">BCAS Integrated System</p>

        <div className="splash-progress" aria-hidden="true">
          <div className="splash-track">
            <span className="splash-fill" style={{ width: `${percent}%` }} />
          </div>
          <div className="splash-meta">
            <span className="splash-stage">{stage}</span>
            <span className="splash-percent">{percent}%</span>
          </div>
        </div>
      </div>

      <ul className="splash-steps" aria-hidden="true">
        {BOOT_STEPS.map((step) => (
          <li key={step.label} className={percent >= step.from ? "is-on" : undefined}>
            {step.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
