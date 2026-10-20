import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyExamResult } from "../api/admissionStepsApi.js";
import { ApiError } from "../api/apiClient.js";
import { formatCalendarDate, formatDateTime } from "../utils/format.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import Notice from "../components/ui/Notice.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import "./ResultPages.css";
import Skeleton from "../components/ui/Skeleton.jsx";

const TONE = { Passed: "success", Failed: "danger", Retake: "warning", Waiting: "info" };
const HEADLINE = {
  Waiting: "Your result isn't out yet",
  Passed: "You passed the entrance exam",
  Failed: "You did not pass the entrance exam",
  Retake: "You need to retake the entrance exam",
};

export default function ExamResultPage() {
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getMyExamResult()
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch((error) => {
        if (!cancelled) setErrorMessage(error instanceof ApiError ? error.message : "Failed to load your exam result.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppLayout title="Exam Result">
      {isLoading && (
        <Card>
          <Skeleton />
        </Card>
      )}

      {errorMessage && (
        <Card>
          <p className="form-error" role="alert">
            {errorMessage} <Link to="/applications">Apply now</Link>.
          </p>
        </Card>
      )}

      {result && (
        <Card>
          <Notice tone={TONE[result.status]} title={HEADLINE[result.status]}>
            {result.nextStep}
          </Notice>

          {result.nextStepPath && (
            <p className="result-cta">
              <Link className="btn btn-primary" to={result.nextStepPath}>
                {result.status === "Passed" ? "See interview details" : "Continue"}
              </Link>
            </p>
          )}

          {result.status !== "Waiting" && (
            <dl className="result-facts">
              <div>
                <dt>Result</dt>
                <dd>
                  <StatusBadge status={result.status === "Retake" ? "Pending" : result.status === "Passed" ? "Approved" : "Rejected"} label={result.status} />
                </dd>
              </div>
              {result.score != null && (
                <div>
                  <dt>Score</dt>
                  <dd>{result.score}</dd>
                </div>
              )}
              <div>
                <dt>Released</dt>
                <dd>{formatDateTime(result.releasedAt)}</dd>
              </div>
              {result.remarks && (
                <div className="result-facts-wide">
                  <dt>Remarks</dt>
                  <dd>{result.remarks}</dd>
                </div>
              )}
            </dl>
          )}

          {result.history.length > 1 && (
            <>
              <h2 className="result-heading">Your attempts</h2>
              <ul className="result-history">
                {result.history.map((attempt) => (
                  <li key={attempt.attempt}>
                    <span>Attempt {attempt.attempt}</span>
                    <span>{attempt.examDate ? formatCalendarDate(attempt.examDate) : formatDateTime(attempt.recordedAt)}</span>
                    <strong>{attempt.result}</strong>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      )}
    </AppLayout>
  );
}
