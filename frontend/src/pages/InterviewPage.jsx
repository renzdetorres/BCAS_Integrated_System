import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyInterview } from "../api/admissionStepsApi.js";
import { ApiError } from "../api/apiClient.js";
import { formatCalendarDate } from "../utils/format.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import Notice from "../components/ui/Notice.jsx";
import "./ResultPages.css";

const TONE = { NotYet: "info", Scheduled: "info", Passed: "success", Failed: "danger" };
const HEADLINE = {
  NotYet: "No interview scheduled yet",
  Scheduled: "Your interview is scheduled",
  Passed: "You passed admission",
  Failed: "Your application was not accepted",
};

function formatTime(isoTime) {
  const [hours, minutes] = isoTime.split(":").map(Number);
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function InterviewPage() {
  const [interview, setInterview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getMyInterview()
      .then((data) => {
        if (!cancelled) setInterview(data);
      })
      .catch((error) => {
        if (!cancelled) setErrorMessage(error instanceof ApiError ? error.message : "Failed to load your interview.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasSchedule = interview && interview.interviewDate;

  return (
    <AppLayout title="Interview & Admission Result">
      {isLoading && (
        <Card>
          <p>Loading...</p>
        </Card>
      )}

      {errorMessage && (
        <Card>
          <p className="form-error" role="alert">
            {errorMessage} <Link to="/applications">Apply now</Link>.
          </p>
        </Card>
      )}

      {interview && (
        <Card>
          <Notice tone={TONE[interview.status]} title={HEADLINE[interview.status]}>
            {interview.message}
          </Notice>

          {hasSchedule && (
            <dl className="result-facts">
              <div>
                <dt>Date</dt>
                <dd>{formatCalendarDate(interview.interviewDate)}</dd>
              </div>
              <div>
                <dt>Time</dt>
                <dd>{formatTime(interview.interviewTime)}</dd>
              </div>
              <div className="result-facts-wide">
                <dt>Where</dt>
                <dd>{interview.location}</dd>
              </div>
              {interview.instructions && (
                <div className="result-facts-wide">
                  <dt>Instructions</dt>
                  <dd>{interview.instructions}</dd>
                </div>
              )}
            </dl>
          )}

          {(interview.status === "Scheduled" || interview.status === "NotYet") && (
            <p className="result-reminder" role="note">
              <strong>Reminder:</strong> {interview.reminder}
            </p>
          )}

          {interview.status === "Passed" && (
            <p className="result-reminder" role="note">
              <strong>Next:</strong> go to the registrar&apos;s office to enroll. This portal does not process enrollment; it only tells you
              when you are ready.
            </p>
          )}
        </Card>
      )}
    </AppLayout>
  );
}
