import "./AdmissionStepper.css";

/**
 * The five stages of filling in the admission application. Wide screens show
 * every stage as a numbered circle; phones show "Step 2 of 5" with a bar,
 * since five labels would not fit on one line. Finished stages can be
 * revisited; later ones can't be jumped to.
 */
export default function AdmissionStepper({ steps, current, onSelect }) {
  const total = steps.length;

  return (
    <nav className="admission-stepper" aria-label="Application progress">
      <ol className="admission-stepper-list">
        {steps.map((step, index) => {
          const state = index < current ? "done" : index === current ? "current" : "todo";
          return (
            <li key={step.id} className={`admission-stepper-item admission-stepper-${state}`} aria-current={state === "current" ? "step" : undefined}>
              <button
                type="button"
                className="admission-stepper-button"
                disabled={state === "todo"}
                onClick={() => onSelect(index)}
              >
                <span className="admission-stepper-circle" aria-hidden="true">
                  {state === "done" ? (
                    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m3.5 8.5 3 3 6-7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="admission-stepper-label">{step.label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="admission-stepper-compact" aria-hidden="true">
        <p>
          <strong>
            Step {current + 1} of {total}
          </strong>{" "}
          &middot; {steps[current].label}
        </p>
        <div className="admission-stepper-bar">
          <span style={{ width: `${((current + 1) / total) * 100}%` }} />
        </div>
      </div>
    </nav>
  );
}
