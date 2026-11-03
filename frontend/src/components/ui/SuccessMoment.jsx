import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./SuccessMoment.css";

const SHOW_MS = 2600;

/**
 * A short celebration for an approval: a green check draws itself inside a ring, the title and a
 * reference settle beneath it, and the card closes on its own. Click, Escape or the keyboard
 * dismiss it sooner. Used through `showSuccessMoment` from the toast context.
 */
export default function SuccessMoment({ title, detail, onDone }) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const timer = setTimeout(() => onDoneRef.current(), SHOW_MS);
    function handleKeyDown(event) {
      if (event.key === "Escape" || event.key === "Enter") onDoneRef.current();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return createPortal(
    <div className="success-moment-backdrop" onClick={() => onDoneRef.current()}>
      <div className="success-moment" role="status" aria-live="polite">
        <span className="success-moment-badge" aria-hidden="true">
          <span className="success-moment-ring" />
          <span className="success-moment-disc">
            <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path className="success-moment-check" pathLength="1" d="M5.5 12.8 10 17.2 18.6 7.6" />
            </svg>
          </span>
        </span>
        <p className="success-moment-title">{title}</p>
        {detail ? <p className="success-moment-detail">{detail}</p> : null}
      </div>
    </div>,
    document.body,
  );
}
