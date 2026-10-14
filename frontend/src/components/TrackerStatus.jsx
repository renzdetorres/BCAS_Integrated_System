import { Link } from "react-router-dom";
import { ADMISSION_STEP_LABELS } from "./WorkflowStepper.jsx";
import "./TrackerStatus.css";

// Answers the applicant's three questions under the tracker: where am I,
// what is done, what do I do next.
export default function TrackerStatus({ steps, subProcess, nextAction, nextActionPath, labels = ADMISSION_STEP_LABELS, closedMessage }) {
  const completed = steps.filter((s) => s.isComplete).length;
  const current = steps.find((s) => s.isCurrent);

  if (!current) {
    return (
      <p className="tracker-status tracker-status-ended">
        {closedMessage ?? "This application is closed. Contact the admissions office if you have questions."}
      </p>
    );
  }

  return (
    <dl className="tracker-status">
      <div>
        <dt>You are here</dt>
        <dd>
          {labels[current.step] ?? current.step}
          {subProcess && <span className="tracker-status-sub"> &middot; {subProcess}</span>}
        </dd>
      </div>
      <div>
        <dt>Completed</dt>
        <dd>
          {completed} of {steps.length} stages
        </dd>
      </div>
      {nextAction && (
        <div className="tracker-status-next">
          <dt>What to do next</dt>
          <dd>
            {nextAction}
            {nextActionPath ? (
              <Link className="tracker-status-link" to={nextActionPath}>
                Go there
              </Link>
            ) : null}
          </dd>
        </div>
      )}
    </dl>
  );
}
